import { onUnmounted, shallowRef, watch, type Ref } from 'vue'
import Hls from 'hls.js'
import Mpegts from 'mpegts.js'
import type { PlaybackStatus, VideoSource } from './types'

const MAX_RETRIES = 3

export function useVideoStream(
  videoRef: Ref<HTMLVideoElement | null>,
  source: Readonly<Ref<VideoSource>>,
) {
  const status = shallowRef<PlaybackStatus>('idle')
  const errorMessage = shallowRef('')
  let hls: Hls | null = null
  let mpegts: Mpegts.Player | null = null
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let readyListener: (() => void) | undefined
  let nativeErrorListener: (() => void) | undefined
  let generation = 0
  let retries = 0

  function setStatus(next: PlaybackStatus, message = '') {
    status.value = next
    errorMessage.value = message
  }

  function clearRetry() {
    if (retryTimer) clearTimeout(retryTimer)
    retryTimer = undefined
  }

  function destroy() {
    generation += 1
    clearRetry()
    hls?.destroy()
    mpegts?.destroy()
    hls = null
    mpegts = null

    const video = videoRef.value
    if (video) {
      if (readyListener) video.removeEventListener('canplay', readyListener)
      if (nativeErrorListener) video.removeEventListener('error', nativeErrorListener)
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
    readyListener = undefined
    nativeErrorListener = undefined
  }

  async function tryPlay(video: HTMLVideoElement, currentGeneration: number) {
    if (currentGeneration !== generation) return

    try {
      await video.play()
      if (currentGeneration === generation) setStatus('playing')
    } catch {
      if (currentGeneration === generation) {
        setStatus('paused', '浏览器阻止了自动播放，请点击播放')
      }
    }
  }

  function scheduleRetry(message: string, currentGeneration: number) {
    if (currentGeneration !== generation || retryTimer) return
    if (retries >= MAX_RETRIES) {
      setStatus('error', message)
      return
    }

    retries += 1
    setStatus('retrying', `${message}，正在重试（${retries}/${MAX_RETRIES}）`)
    retryTimer = setTimeout(() => {
      retryTimer = undefined
      void start(source.value, false)
    }, retries * 1000)
  }

  function bindVideoEvents(video: HTMLVideoElement, currentGeneration: number) {
    readyListener = () => void tryPlay(video, currentGeneration)
    nativeErrorListener = () => scheduleRetry('视频流加载失败', currentGeneration)
    video.addEventListener('canplay', readyListener)
    video.addEventListener('error', nativeErrorListener)
  }

  async function start(nextSource: VideoSource, resetRetries: boolean) {
    if (resetRetries) retries = 0
    destroy()

    const video = videoRef.value
    if (!video) return

    const currentGeneration = generation
    video.muted = true
    video.autoplay = true
    video.playsInline = true
    bindVideoEvents(video, currentGeneration)

    if (!nextSource.url) {
      setStatus('error', '未配置视频流地址')
      return
    }

    setStatus('loading')

    if (nextSource.protocol === 'hls') {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = nextSource.url
        video.load()
        return
      }

      if (!Hls.isSupported()) {
        setStatus('unsupported', '当前浏览器不支持 HLS 播放')
        return
      }

      hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 })
      hls.on(Hls.Events.MANIFEST_PARSED, () => void tryPlay(video, currentGeneration))
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal || currentGeneration !== generation) return
        scheduleRetry('HLS 视频流连接失败', currentGeneration)
      })
      hls.attachMedia(video)
      hls.loadSource(nextSource.url)
      return
    }

    if (!Mpegts.getFeatureList().mseLivePlayback) {
      setStatus('unsupported', '当前浏览器不支持 HTTP-FLV 播放')
      return
    }

    mpegts = Mpegts.createPlayer(
      { type: 'flv', url: nextSource.url, isLive: true, cors: true },
      { enableWorker: true, enableWorkerForMSE: true, enableStashBuffer: false },
    )
    mpegts.on(Mpegts.Events.MEDIA_INFO, () => void tryPlay(video, currentGeneration))
    mpegts.on(Mpegts.Events.ERROR, () =>
      scheduleRetry('HTTP-FLV 视频流连接失败', currentGeneration),
    )
    mpegts.attachMediaElement(video)
    mpegts.load()
  }

  function retry() {
    void start(source.value, true)
  }

  function handlePlay() {
    setStatus('playing')
  }

  function handlePause() {
    if (status.value === 'playing') setStatus('paused')
  }

  watch(
    [videoRef, source],
    ([video, nextSource]) => {
      if (video) void start(nextSource, true)
    },
    { immediate: true },
  )

  onUnmounted(destroy)

  return { status, errorMessage, retry, handlePlay, handlePause }
}

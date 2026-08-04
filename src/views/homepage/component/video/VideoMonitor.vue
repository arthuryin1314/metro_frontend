<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useVideoStream } from './useVideoStream'
import type { VideoSource } from './types'

const props = defineProps<{ source: VideoSource }>()
const videoRef = useTemplateRef<HTMLVideoElement>('video')
const source = computed(() => props.source)
const { status, errorMessage, retry, handlePlay, handlePause } = useVideoStream(videoRef, source)

const statusText = computed(() => {
  if (status.value === 'loading') return '正在连接视频流…'
  if (status.value === 'retrying') return errorMessage.value
  if (status.value === 'error' || status.value === 'unsupported') return errorMessage.value
  if (status.value === 'paused') return errorMessage.value || '视频已暂停'
  return ''
})
</script>

<template>
  <div class="video-monitor">
    <video
      ref="video"
      class="video-monitor__media"
      controls
      muted
      autoplay
      playsinline
      :poster="source.poster"
      @play="handlePlay"
      @pause="handlePause"
    />
    <div v-if="status !== 'playing'" class="video-monitor__overlay" aria-live="polite">
      <span>{{ statusText }}</span>
      <button
        v-if="status === 'error' || status === 'unsupported' || status === 'paused'"
        class="video-monitor__retry"
        type="button"
        @click="retry"
      >
        {{ status === 'paused' ? '播放' : '重试' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.video-monitor {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #030b12;
}

.video-monitor__media {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #030b12;
}

.video-monitor__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  color: #b8d9e8;
  font-size: 13px;
  text-align: center;
  background: rgb(3 11 18 / 72%);
}

.video-monitor__retry {
  padding: 4px 14px;
  border: 1px solid #4da6c7;
  border-radius: 2px;
  color: #dff6ff;
  background: #0c3546;
  cursor: pointer;
}
</style>

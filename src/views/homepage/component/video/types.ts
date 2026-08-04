export type VideoProtocol = 'hls' | 'flv'

export type PlaybackStatus =
  'idle' | 'loading' | 'playing' | 'paused' | 'retrying' | 'error' | 'unsupported'

export interface VideoSource {
  url: string
  protocol: VideoProtocol
  poster?: string
}

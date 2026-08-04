/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VIDEO_MONITOR_URL?: string
  readonly VITE_VIDEO_MONITOR_PROTOCOL?: 'hls' | 'flv'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

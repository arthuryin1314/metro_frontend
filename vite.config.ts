import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import cesium from 'vite-plugin-cesium'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_TARGET || 'http://127.0.0.1:8092'
  const amapApiKey = encodeURIComponent(env.AMAP_API_KEY || '')

  return {
    plugins: [vue(), vueDevTools(), cesium()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api/v1': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
        },
        '/static': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/amap-api': {
          target: 'https://restapi.amap.com',
          changeOrigin: true,
          rewrite: (path) =>
            `${path.replace(/^\/amap-api/, '')}${path.includes('?') ? '&' : '?'}key=${amapApiKey}`,
        },
      },
    },
  }
})

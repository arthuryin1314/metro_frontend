import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Viewer } from 'cesium'

export const useCesiumStore = defineStore('cesium', () => {
  const cesiumInstance = ref<Viewer | null>(null)
  function SetViewer(viewer: Viewer | null) {
    cesiumInstance.value = viewer
  }

  return { cesiumInstance, SetViewer }
})

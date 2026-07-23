import { shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { Cesium3DTileset, Viewer } from 'cesium'

export const useCesiumStore = defineStore('cesium', () => {
  const cesiumInstance = shallowRef<Viewer | null>(null)
  const tilesetInstance = shallowRef<Cesium3DTileset | null>(null)

  function SetViewer(viewer: Viewer | null) {
    cesiumInstance.value = viewer
  }

  function SetTileset(tileset: Cesium3DTileset | null) {
    tilesetInstance.value = tileset
  }

  return { cesiumInstance, tilesetInstance, SetViewer, SetTileset }
})

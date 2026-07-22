<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef, markRaw } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/stores/ceisumStore'
import { AMapImageryProvider } from '@cesium-china/cesium-map'
const containerRef = useTemplateRef<HTMLDivElement>('container')
const cesiumStore = useCesiumStore()
let viewer: Cesium.Viewer | undefined
const AmapOptions = {
  style: 'img', // style: img、elec、cva
  crs: 'WGS84' // 使用84坐标系，默认为：GCJ02
} as const
onMounted(() => {
  Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN

  viewer = new Cesium.Viewer(containerRef.value!, {
    timeline: true, //设置默认的时间轴不显示
    animation: true, //隐藏动画控件
    baseLayerPicker: false, //隐藏底图切换
    baseLayer: false, //禁用默认底图，避免和高德图层叠加
    geocoder: true, //隐藏导航功能
    homeButton: false, //复位按钮
    sceneModePicker: false, //二三维切换按钮
    navigationHelpButton: false, //隐藏帮助按钮
    scene3DOnly: true, // 如果是三维的系统，最好加上这个配置
    shouldAnimate: true, //最好设置动画为true
  })
  viewer.scene.globe.enableLighting = true
  viewer.scene.sun!.show = true
  viewer.imageryLayers.add(new Cesium.ImageryLayer(new AMapImageryProvider(AmapOptions)))
  cesiumStore.SetViewer(markRaw(viewer))
})

onUnmounted(() => {
  cesiumStore.SetViewer(null)
  viewer?.destroy()
})
</script>
<template>
  <div ref="container" class="cesium-container"></div>
</template>
<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
}
</style>
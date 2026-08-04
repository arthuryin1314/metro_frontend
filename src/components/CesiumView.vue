<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef, markRaw } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/stores/ceisumStore'
import { AMapImageryProvider } from '@cesium-china/cesium-map'
const containerRef = useTemplateRef<HTMLDivElement>('container')
const cesiumStore = useCesiumStore()
let viewer: Cesium.Viewer | undefined
let isUnmounted = false
const tilesetUrl = 'http://localhost:90/model/tileset.json'
const AmapOptions = {
  style: 'img', // style: img、elec、cva
  crs: 'WGS84', // 使用84坐标系，默认为：GCJ02
} as const
onMounted(async () => {
  viewer = new Cesium.Viewer(containerRef.value!, {
    timeline: true, //设置默认的时间轴不显示
    animation: false, //隐藏动画控件
    baseLayerPicker: false, //隐藏底图切换
    baseLayer: false, //禁用默认底图，避免和高德图层叠加
    geocoder: false, //隐藏导航功能
    homeButton: false, //复位按钮
    sceneModePicker: false, //二三维切换按钮
    navigationHelpButton: false, //隐藏帮助按钮
    scene3DOnly: true, // 如果是三维的系统，最好加上这个配置
    shouldAnimate: true, //最好设置动画为true
    fullscreenButton: false, //隐藏全屏按钮
  })
  viewer.creditDisplay.container.style.display = 'none'
  viewer.scene.globe.enableLighting = true
  viewer.scene.sun!.show = true
  viewer.imageryLayers.add(new Cesium.ImageryLayer(new AMapImageryProvider(AmapOptions)))
  cesiumStore.SetViewer(markRaw(viewer))
  try {
    const loadedTileset = await Cesium.Cesium3DTileset.fromUrl(tilesetUrl)

    if (isUnmounted || !viewer || viewer.isDestroyed()) {
      loadedTileset.destroy()
      return
    }

    viewer.scene.primitives.add(loadedTileset)
    cesiumStore.SetTileset(markRaw(loadedTileset))
    const boundingSphere = loadedTileset.boundingSphere
    // ponytail: 锚点南移半径，覆盖 zoomTo 默认盯着模型中心的行为，调这个系数即可改变往南多远
    const shiftedCenter = Cesium.Matrix4.multiplyByPoint(
      Cesium.Transforms.eastNorthUpToFixedFrame(boundingSphere.center),
      new Cesium.Cartesian3(0, -boundingSphere.radius * 0.06, 0),
      new Cesium.Cartesian3(),
    )
    void viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(shiftedCenter, boundingSphere.radius),
      {
        offset: new Cesium.HeadingPitchRange(
          0,
          Cesium.Math.toRadians(-30),
          boundingSphere.radius * 0.04,
        ),
        duration: 0, // ponytail: 0秒即跳过飞行动画，加载完成后直接定位到目标视角
      },
    )
  } catch (error) {
    console.error('3D Tileset 加载失败：', error)
  }
})

onUnmounted(() => {
  isUnmounted = true
  cesiumStore.SetTileset(null)
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

:global(.cesium-viewer-timelineContainer) {
  top: 72px !important;
  right: auto !important;
  bottom: auto !important;
  left: 50% !important;
  width: min(560px, 32vw) !important;
  transform: translateX(-50%);
}
</style>

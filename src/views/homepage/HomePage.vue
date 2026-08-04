<script setup lang="ts">
import OperationChart from './component/chart/OperationChart.vue'
import PagePanel from '@/components/PagePanel.vue'
import SubwayActivity from './component/chart/SubwayActivity.vue'
import MetroFlow from './component/chart/MetroFlow.vue'
import subwayOverviewImage from '@/assets/uiResources/sub.png'
import AlarmChart from './component/chart/AlarmChart.vue'
import VideoMonitor from './component/video/VideoMonitor.vue'
import type { VideoSource } from './component/video/types'

const videoSource: VideoSource = {
  url: import.meta.env.VITE_VIDEO_MONITOR_URL ?? '',
  protocol: import.meta.env.VITE_VIDEO_MONITOR_PROTOCOL === 'flv' ? 'flv' : 'hls',
}
</script>
<template>
  <main class="home-page">
    <aside class="dashboard-panels dashboard-panels--left" aria-label="左侧数据面板">
      <PagePanel>
        <template #header><h2>运营统计</h2></template>
        <template #content><OperationChart /></template>
      </PagePanel>
      <PagePanel>
        <template #header><h2>地铁活动</h2></template>
        <template #content><SubwayActivity /></template>
      </PagePanel>
      <PagePanel>
        <template #header><h2>客流指标</h2></template>
        <template #content><MetroFlow /></template>
      </PagePanel>
    </aside>
    <aside class="dashboard-panels dashboard-panels--right" aria-label="右侧数据面板">
      <PagePanel>
        <template #header><h2>线路概览</h2></template>
        <template #content>
          <img class="subway-overview" :src="subwayOverviewImage" alt="武汉地铁线路图" />
        </template>
      </PagePanel>
      <PagePanel class="alarm-panel">
        <template #header><h2>告警趋势</h2></template>
        <template #content><AlarmChart /></template>
      </PagePanel>
      <PagePanel class="video-panel">
        <template #header><h2>实时影像</h2></template>
        <template #content><VideoMonitor :source="videoSource" /></template>
      </PagePanel>
    </aside>
  </main>
</template>
<style scoped>
.home-page {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.home-page :deep(.page-header),
.home-page :deep(.page-footer),
.dashboard-panels {
  pointer-events: auto;
}

.dashboard-panels {
  position: absolute;
  z-index: 5;
  top: 50px;
  bottom: 96px;
  display: grid;
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 12px;
  width: min(28vw, 531px);
}

.dashboard-panels--left {
  left: 24px;
}

.dashboard-panels--right {
  right: 24px;
  transform: translateY(40px);
  grid-template-rows: minmax(0, 0.6fr) minmax(0, 1.5fr) minmax(0, 0.9fr);
}

.dashboard-panels--right > :deep(.panel:first-child) {
  margin-top: -40px;
}

.dashboard-panels :deep(.panel) {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.dashboard-panels :deep(.panel-content) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.alarm-panel :deep(.panel-content) {
  overflow-x: hidden;
  overflow-y: auto;
}

.video-panel :deep(.panel-content) {
  display: flex;
  overflow: hidden;
}

.dashboard-panels :deep(.panel-header h2) {
  margin: 0;
  font: inherit;
}

.subway-overview {
  display: block;
  width: 100%;
  height: auto;
  background-color: #071522;
}
</style>

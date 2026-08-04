<script setup lang="ts">
import { computed } from 'vue'
import { VueUiXy, type VueUiXyDatasetItem } from 'vue-data-ui/vue-ui-xy'
import { alarmChartConfig as config } from '@/chartConfig/alarmChart'
import 'vue-data-ui/style.css' // 如果您使用多个组件，请将此样式导入放在您的主文件中

const dataset = computed<VueUiXyDatasetItem[]>(() => {
  return [
    {
      name: 'Serie name',
      series: [1, 9, 7, 2, 12, 16, 17, 30, 16, 23, 0, 0],
      color: '#1f77b4',
      type: 'line',
      shape: 'circle',
      useArea: false,
      useProgression: false,
      dataLabels: true,
      smooth: true,
      dashed: false,
      useTag: 'none',
    },
    {
      name: 'name',
      series: [2, 7, 10, 13, 15, 18, 19, 25, 28, 29, 35, 36],
      color: '#42d392',
      type: 'line',
      shape: 'circle',
      useArea: false,
      useProgression: false,
      dataLabels: true,
      smooth: true,
      dashed: false,
      useTag: 'none',
    },
  ]
})
</script>
<template>
  <!-- Using a wrapper is optional -->
  <div class="alarm-chart">
    <VueUiXy :config="config" :dataset="dataset" />
  </div>
</template>
<style scoped>
.alarm-chart {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
</style>

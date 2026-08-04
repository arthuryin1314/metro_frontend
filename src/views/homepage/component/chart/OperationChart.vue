<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  VueUiHorizontalBar,
  type VueUiHorizontalBarDatasetItem,
} from 'vue-data-ui/vue-ui-horizontal-bar'
import { operationChartConfig } from '@/chartConfig/operationChart'
import { getLine, type Line } from '@/api/line'

const dataset = ref<VueUiHorizontalBarDatasetItem[]>([])
async function getLineList() {
  const res = await getLine()
  const lineList = res.data.data
  dataset.value = lineList.map((line: Line) => ({
    name: line.name,
    value: Math.round(Number(line.length) || 0),
    color: `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')}`,
    children: [],
  }))
}
onMounted(() => {
  getLineList()
})
</script>

<template>
  <div class="operation-chart">
    <VueUiHorizontalBar :config="operationChartConfig" :dataset="dataset" />
  </div>
</template>

<style scoped>
.operation-chart {
  width: 100%;
}
</style>

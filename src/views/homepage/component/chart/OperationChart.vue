<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  VueUiHorizontalBar,
  type VueUiHorizontalBarDatasetItem,
} from 'vue-data-ui/vue-ui-horizontal-bar'
import { buildLineBarDataset, operationChartConfig } from '@/chartConfig/operationChart'
import { getLine } from '@/api/line'

const dataset = ref<VueUiHorizontalBarDatasetItem[]>([])
async function getLineList() {
  const res = await getLine()
  dataset.value = buildLineBarDataset(res.data.data)
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

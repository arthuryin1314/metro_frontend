<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { metroFlowConfig } from '@/chartConfig/metroFlow'
import {
  VueUiHorizontalBar,
  type VueUiHorizontalBarDatasetItem,
} from 'vue-data-ui/vue-ui-horizontal-bar'
import 'vue-data-ui/style.css' // 如果您使用多个组件，请将此样式导入放在您的主文件中
import { getFlowData, type Flow } from '@/api/flow'

const dataList = ref<VueUiHorizontalBarDatasetItem[]>([])
async function getFlow() {
  const res = await getFlowData()
  const flowList = res.data.data.lines
  dataList.value = flowList.map((flow: Flow) => ({
    name: flow.lineName,
    value: flow.passengerFlow,
    color: `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')}`,
    children: [],
  }))
}
onMounted(() => {
  getFlow()
})
</script>
<template>
  <!-- Using a wrapper is optional -->
  <div class="metro-flow">
    <VueUiHorizontalBar :config="metroFlowConfig" :dataset="dataList" />
  </div>
</template>
<style scoped>
.metro-flow {
  width: 100%;
}
</style>

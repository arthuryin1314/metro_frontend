<script setup lang="ts">
import { Vue3SeamlessScroll } from 'vue3-seamless-scroll'
import { ref, onMounted } from 'vue'
import { getActivity } from '@/api/activity'
interface Activity {
  id: number
  title: string
  activityDate: string
  content: string
  dataType: string
  sourceName: string
  sourceUrl: string
}
const dataList = ref<Activity[]>([])
async function fetchActivity() {
  const res = await getActivity()
  dataList.value = res.data.data
}
onMounted(() => {
  fetchActivity()
})
</script>
<template>
  <div class="subway-activity">
    <Vue3SeamlessScroll :list="dataList as any" v-if="dataList.length">
      <template v-slot="{ data }">
        <div class="activity-item">
          <span>{{ data.activityDate }}</span>
          <span>{{ data.title }}</span>
        </div>
      </template>
    </Vue3SeamlessScroll>
  </div>
</template>
<style scoped>
.subway-activity {
  height: 100%;
  overflow: hidden;
}

.activity-item {
  line-height: 30px;
}
</style>

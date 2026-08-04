<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { getWeather } from '@/api/weather'
import headerBackground from '@/assets/uiResources/header.png'
//header的时间
const now = shallowRef(new Date())
let timer: number

const currentDate = computed(() => {
  const date = now.value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
})
const currentDay = computed(() =>
  new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(now.value),
)
const currentTime = computed(
  () =>
    `${String(now.value.getHours()).padStart(2, '0')}:${String(now.value.getMinutes()).padStart(2, '0')}`,
)
//获取实时天气
const currentWeather = shallowRef('')
const currentTemperature = shallowRef('')
const currentHumidity = shallowRef('')
async function getAmapWeather() {
  return await getWeather({
    city: '420100',
    extensions: 'base',
    output: 'JSON',
  })
}
onMounted(async () => {
  timer = window.setInterval(() => (now.value = new Date()), 1000)
  const res = await getAmapWeather()
  const weather = res.data.lives[0]
  currentHumidity.value = weather.humidity
  currentWeather.value = weather.weather
  currentTemperature.value = weather.temperature
})

onUnmounted(() => window.clearInterval(timer))
</script>
<template>
  <header class="page-header" :style="{ backgroundImage: `url(${headerBackground})` }">
    <div class="left">
      <span>武汉市</span>
      <span>{{ currentDate }}</span>
      <span>{{ currentDay }}</span>
      <span>{{ currentTime }}</span>
    </div>
    <div class="center">
      <h1>地铁三维可视化管控平台</h1>
    </div>
    <div class="right">
      <span>湿度: {{ currentHumidity }}%</span>
      <span>{{ currentWeather }}</span>
      <span>{{ currentTemperature }}℃</span>
    </div>
  </header>
</template>
<style scoped>
.page-header {
  position: absolute;
  z-index: 10;
  top: 6px;
  left: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  width: 100%;
  height: 60px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  color: #e9f8ff;
  font-size: 16px;
  font-weight: 600;
  text-shadow: 0 0 6px #091726;
}

.left,
.right {
  display: flex;
  align-items: center;
  gap: 28px;
  transform: translateY(-6px);
}

.left {
  padding-left: 24px;
}

.center {
  text-align: center;
  transform: translateY(-6px);
}

.center h1 {
  margin: 0;
  color: #f8e9bf;
  font-size: 26px;
  letter-spacing: 3px;
}

.right {
  justify-content: flex-end;
  padding-right: 28px;
}
</style>

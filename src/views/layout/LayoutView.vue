<script setup lang="ts">
import CesiumView from '@/components/CesiumView.vue'
import PageHeader from './component/PageHeader.vue'
import PageFooter from './component/PageFooter.vue'
</script>

<template>
  <main class="layout-view">
    <PageHeader />
    <CesiumView />
    <RouterView />
    <PageFooter />
  </main>
</template>

<style scoped>
.layout-view {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>

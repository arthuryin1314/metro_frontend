<script setup lang="ts">
import panelContentBackground from '@/assets/uiResources/panel-content.png'
import panelHeaderBackground from '@/assets/uiResources/panel-header.png'
</script>

<template>
  <section class="panel">
    <header class="panel-header" :style="{ backgroundImage: `url(${panelHeaderBackground})` }">
      <slot name="header" />
    </header>
    <div class="panel-content" :style="{ backgroundImage: `url(${panelContentBackground})` }">
      <slot name="content" />
    </div>
  </section>
</template>

<style scoped>
.panel {
  width: min(531px, 100%);
  color: #e9f8ff;
}

.panel-header {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: 45px;
  padding: 0 38px;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  color: #f4c54d;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 2px;
  text-shadow: 0 0 6px #091726;
}

.panel-content {
  box-sizing: border-box;
  min-height: 229px;
  padding: 14px 18px 18px;
  background-repeat: no-repeat;
  background-size: 100% 100%;
}
</style>

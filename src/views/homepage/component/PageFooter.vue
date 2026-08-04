<script setup lang="ts">
import footerBackground from '@/assets/uiResources/footer.png'

const menuItems = [
  { label: '实时轨迹', name: 'CurrentRail' },
  { label: '重点活动', name: 'Activity' },
  { label: '首页', name: 'Home' },
  { label: '发展历程', name: 'History' },
  { label: '站点管理', name: 'manageStation' },
]
</script>

<template>
  <footer class="page-footer" :style="{ backgroundImage: `url(${footerBackground})` }">
    <nav class="footer-nav" aria-label="页面导航">
      <RouterLink
        v-for="item in menuItems"
        :key="item.name"
        :to="{ name: item.name }"
        active-class="active"
      >
        {{ item.label }}
      </RouterLink>
    </nav>
  </footer>
</template>

<style scoped>
.page-footer {
  position: absolute;
  z-index: 10;
  right: 0;
  bottom: 0;
  left: 0;
  height: 84px;
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: 100% 100%;
}

.footer-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(450px, 40vw);
  height: 56px;
  margin: 16px auto 0;
}

.footer-nav a {
  flex: 1;
  color: #fff;
  font-size: 14px;
  text-align: center;
  text-decoration: none;
  text-shadow: 0 0 6px #001a2f;
}

.footer-nav .active {
  color: #fff0a1;
  font-weight: 700;
  transform: translateY(-7px);
}
</style>

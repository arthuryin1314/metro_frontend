import { createRouter, createWebHistory } from 'vue-router'
import { layoutRoute } from './layout'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [layoutRoute], // 将 layoutRoute 添加到路由配置中
})

export default router

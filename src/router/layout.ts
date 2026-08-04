import type { RouteRecordRaw } from 'vue-router'
import { activityRoute } from './activity'
import { currentRailRoute } from './currentRail'
import { manageStation } from './manageStation'
import { historyRoute } from './history'
import { homeRoute } from './home'
export const layoutRoute: RouteRecordRaw = {
  path: '/',
  name: 'Layout',
  redirect: '/homePage',
  component: () => import('@/views/layout/LayoutView.vue'),
  children: [homeRoute, activityRoute, currentRailRoute, manageStation, historyRoute],
}

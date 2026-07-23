import {activityRoute} from './activity'
import {currentRailRoute} from './currentRail'
import {manageStation} from './manageStation'
import { historyRoute } from './history'
export const layoutRoute = {
  path: '/',
  name: 'Layout',
  component: () => import('@/views/layout/LayoutView.vue'),
  children: [
    activityRoute,
    currentRailRoute,
    manageStation,
    historyRoute
  ]
}

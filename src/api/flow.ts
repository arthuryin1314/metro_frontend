import request from '@/utils/request'

export interface Flow {
  lineId: number
  lineName: string
  passengerFlow: number
  capacity: number
  loadRate: number
  dataSource: string
}

export function getFlowData() {
  return request({
    url: '/passenger-flows/latest',
    method: 'get',
  })
}

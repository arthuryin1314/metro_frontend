import request from '@/utils/request'

interface Station {
  isChange: 0 | 1
  name: string
  peopleFlow: number
  xy_coords: string
}
export interface Line {
  id: number
  name: string
  basicPrice: string
  totalPrice: string
  length: string
  xs: string
  ys: string
  stationsList: Station[]
}
export async function getLine() {
  return await request({
    url: 'getLine',
  })
}

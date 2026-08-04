import request from '@/utils/request'

export function getActivity() {
  return request({
    url: 'activities',
  })
}

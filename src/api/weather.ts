import weatherRequest from '@/utils/AmapWeather'

interface Params {
  city: string
  extensions?: 'base' | 'all'
  output?: 'JSON' | 'XML'
}
export async function getWeather(params: Params) {
  return await weatherRequest({
    method: 'get',
    params,
  })
}

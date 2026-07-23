import axios from 'axios'

export default axios.create({
  baseURL: '/amap-api/v3/weather/weatherInfo',
  timeout: 10_000,
})

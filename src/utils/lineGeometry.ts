import type { Line } from '@/api/line'

/**
 * 线路领域数据:把线路接口的字符串坐标契约规范化为可渲染的 WGS84 数据。
 *
 * 接口契约(已确认):
 * - `xs`: GCJ-02 经度字符串,逗号分隔
 * - `ys`: GCJ-02 纬度字符串,逗号分隔,与 `xs` 按索引配对
 * - 站点 `xy_coords`: 经度;纬度(GCJ-02)
 * 坐标进入 Cesium 前只在这里转换一次为 WGS84。
 */

export interface ParsedLine {
  id: number
  name: string
  /** 是否可渲染;为 false 时 reason 说明原因,轨迹不进渲染层。 */
  renderable: boolean
  /** WGS84 经纬度轨迹,renderable 时至少有 2 个有效点。 */
  positions: Array<[number, number]>
  reason?: string
}

export interface PhysicalStation {
  name: string
  /** WGS84 经纬度。 */
  lng: number
  lat: number
  /** 所属线路 ID 集合,换乘站由它派生。 */
  lineIds: number[]
}

// GCJ-02 -> WGS84 标准算法(wgs2mars 反解),与 @cesium-china/cesium-map 内部实现一致。
// 来源: https://github.com/wandergis/coordTransform 的 GCJ02ToWGS84(2016 年公开,各类地图库通用)。
export function gcj02ToWgs84(lon: number, lat: number): [number, number] {
  const a = 6378245
  const ee = 0.006693421622965943
  function transformLat(x: number, y: number) {
    let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
    ret += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3
    ret += ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3
    ret += ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3
    return ret
  }
  function transformLng(x: number, y: number) {
    let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
    ret += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3
    ret += ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3
    ret += ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3
    return ret
  }
  if (lat < 3.86 || lat > 53.55 || lon < 73.66 || lon > 135.05) return [lon, lat]
  const dLat = transformLat(lon - 105, lat - 35)
  const dLon = transformLng(lon - 105, lat - 35)
  const radLat = (lat / 180) * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - ee * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  const dLat2 = (dLat * 180) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI)
  const dLon2 = (dLon * 180) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI)
  return [lon * 2 - (lon + dLon2), lat * 2 - (lat + dLat2)]
}

function isValidLngLat(lon: number, lat: number): boolean {
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -90 &&
    lat <= 90
  )
}

function toLngLatPair(xStr: string | undefined, yStr: string | undefined): [number, number] | null {
  const lon = Number(xStr)
  const lat = Number(yStr)
  if (xStr === undefined || yStr === undefined || !isValidLngLat(lon, lat)) return null
  return gcj02ToWgs84(lon, lat)
}

/** 解析轨迹字符串;返回 WGS84 坐标数组或显式失败原因。 */
export function parseLineTrace(
  xs: string,
  ys: string,
): { positions: Array<[number, number]> } | { reason: string } {
  const xsArr = xs.split(',').map((s) => s.trim())
  const ysArr = ys.split(',').map((s) => s.trim())
  if (xsArr.length !== ysArr.length) return { reason: '轨迹横纵坐标数量不一致' }
  const positions: Array<[number, number]> = []
  for (let i = 0; i < xsArr.length; i++) {
    const pair = toLngLatPair(xsArr[i], ysArr[i])
    if (!pair) return { reason: '轨迹坐标不可解析' }
    positions.push(pair)
  }
  if (positions.length < 2) return { reason: '有效坐标点不足 2 个' }
  return { positions }
}

/** 解析单个站点坐标;返回 WGS84 经纬度或 null。 */
export function parseStationCoords(xyCoords: string): [number, number] | null {
  const [lonStr, latStr] = xyCoords.split(';')
  return toLngLatPair(lonStr, latStr)
}

// 相同物理站点容差:约 10 米(0.0001 度),允许微小格式误差。
const STATION_MERGE_TOLERANCE = 1e-4

function normalizeStationName(name: string): string {
  return name.trim().replace(/\s+/g, '')
}

/**
 * 建立物理站点注册表:规范化站名与近似坐标共同识别同一物理站点,
 * 相同站点只保留一条记录并累积所属线路;无效站点坐标跳过。
 * 返回 { stations, skipped } —— skipped 为被跳过的站点数。
 */
export function buildStationRegistry(
  lines: Array<{ id: number; stationsList: Array<{ name: string; xy_coords: string }> }>,
): { stations: PhysicalStation[]; skipped: number } {
  const stations: PhysicalStation[] = []
  let skipped = 0
  for (const line of lines) {
    for (const station of line.stationsList) {
      const pos = parseStationCoords(station.xy_coords)
      if (!pos) {
        skipped++
        continue
      }
      const normalizedName = normalizeStationName(station.name)
      const existing = stations.find(
        (s) =>
          s.name === normalizedName &&
          Math.abs(s.lng - pos[0]) < STATION_MERGE_TOLERANCE &&
          Math.abs(s.lat - pos[1]) < STATION_MERGE_TOLERANCE,
      )
      if (existing) {
        if (!existing.lineIds.includes(line.id)) existing.lineIds.push(line.id)
      } else {
        stations.push({ name: normalizedName, lng: pos[0], lat: pos[1], lineIds: [line.id] })
      }
    }
  }
  return { stations, skipped }
}

/** 把接口线路规范化为领域线路数据;坏轨迹显式标记为不可渲染。 */
export function normalizeLines(lines: Line[]): ParsedLine[] {
  return lines.map((line) => {
    const result = parseLineTrace(line.xs, line.ys)
    return 'reason' in result
      ? { id: line.id, name: line.name, renderable: false, positions: [], reason: result.reason }
      : { id: line.id, name: line.name, renderable: true, positions: result.positions }
  })
}

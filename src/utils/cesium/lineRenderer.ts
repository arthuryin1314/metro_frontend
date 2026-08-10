import * as Cesium from 'cesium'
import type { Line } from '@/api/line'
import { normalizeLines, buildStationRegistry } from '../lineGeometry.ts'
import { resolveLineColor } from '../lineColor.ts'

/**
 * 薄 Cesium 渲染适配器:首页线路显示单元的创建与清理。
 * 组件只通过此适配器与 Cesium 交互,不暴露任何 Cesium 对象;
 * 生命周期由返回的清理函数管理,离开首页时完整销毁。
 */

interface RenderableLine {
  id: number
  name: string
  /** WGS84 经纬度。 */
  positions: Array<[number, number]>
}

interface RenderableStation {
  name: string
  /** WGS84 经纬度。 */
  lng: number
  lat: number
  lineIds: number[]
}

/** 线路显示单元的可见控制契约:面板只通过它切换显隐,不接触 Cesium 对象。 */
export interface LineRenderHandle {
  /** 可渲染线路元数据;自然排序在面板侧完成。 */
  lines: Array<{ id: number; name: string; color: string }>
  /** 切换线路显示单元(轨迹 + 独占站点)可见性;不改变相机。 */
  setLineVisible(lineId: number, visible: boolean): void
  /** 整体清理,离开首页时调用。 */
  stop(): void
}

// 样式常量(科技蓝视觉风格)。
const LINE_WIDTH = 4
const LINE_OUTLINE_WIDTH = 2
const LINE_OUTLINE_COLOR = '#0a1a2b'
const STATION_PIXEL_SIZE = 10
const STATION_LABEL_MAX_DISTANCE = 3000 // 站名随镜头距离显示

/** 创建线路与站点实体;返回显隐控制句柄。空输入返回空句柄,不创建地图对象。 */
export function createLineRenderer(
  viewer: Cesium.Viewer,
  lines: RenderableLine[],
  stations: RenderableStation[],
): LineRenderHandle {
  const emptyHandle: LineRenderHandle = { lines: [], setLineVisible: () => {}, stop: () => {} }
  if (lines.length === 0 && stations.length === 0) return emptyHandle
  const dataSource = new Cesium.CustomDataSource('metro-lines')
  viewer.dataSources.add(dataSource)

  // 线路 ID → 该线路的轨迹实体(描边线 + 填充线),供按线路显隐。
  const lineEntities = new Map<number, Cesium.Entity[]>()
  for (const line of lines) {
    // 深色描边:下层宽线 + 上层官方色细线(PolylineGraphics 无原生描边)
    const positions = Cesium.Cartesian3.fromDegreesArray(line.positions.flat())
    const outline = dataSource.entities.add({
      polyline: {
        positions,
        width: LINE_WIDTH + LINE_OUTLINE_WIDTH * 2,
        material: Cesium.Color.fromCssColorString(LINE_OUTLINE_COLOR),
      },
    })
    const fill = dataSource.entities.add({
      polyline: {
        positions,
        width: LINE_WIDTH,
        material: Cesium.Color.fromCssColorString(resolveLineColor(line.id, line.name)),
      },
    })
    lineEntities.set(line.id, [outline, fill])
  }
  // 站点记录:实体 + 所属线路。独占站点(单线路)随线路显隐;
  // ponytail: 换乘站可见性派生(任一所属线路可见)留给后续 Ticket
  const stationRecords: Array<{ entity: Cesium.Entity; lineIds: number[] }> = []
  for (const station of stations) {
    const entity = dataSource.entities.add({
      position: Cesium.Cartesian3.fromDegrees(station.lng, station.lat),
      point: {
        pixelSize: STATION_PIXEL_SIZE,
        color: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.fromCssColorString(LINE_OUTLINE_COLOR),
        outlineWidth: LINE_OUTLINE_WIDTH,
      },
      label: {
        text: station.name,
        font: '12px sans-serif',
        fillColor: Cesium.Color.WHITE,
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString(LINE_OUTLINE_COLOR),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -14),
        // ponytail: 换乘站的更宽距离显示是 #5 的范围
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
          0,
          STATION_LABEL_MAX_DISTANCE,
        ),
      },
    })
    stationRecords.push({ entity, lineIds: station.lineIds })
  }

  return {
    lines: lines.map((l) => ({ id: l.id, name: l.name, color: resolveLineColor(l.id, l.name) })),
    setLineVisible(lineId, visible) {
      for (const entity of lineEntities.get(lineId) ?? []) entity.show = visible
      for (const record of stationRecords) {
        if (record.lineIds.length === 1 && record.lineIds[0] === lineId) {
          record.entity.show = visible
        }
      }
    },
    stop() {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(dataSource, true)
    },
  }
}

/**
 * 首页级入口:请求线路数据 → 规范化 → 渲染。
 * 接口失败或返回空数组都作为正常空状态处理,返回空句柄。
 */
export async function loadMetroLines(viewer: Cesium.Viewer): Promise<LineRenderHandle> {
  try {
    // 动态导入:避免静态值依赖把 api/axios 链带进纯渲染模块
    const { getLine } = await import('@/api/line')
    const res = await getLine()
    const rawLines: Line[] = res.data.data
    const lines = normalizeLines(rawLines)
    const renderable = lines.filter((l) => l.renderable)
    // 只从可渲染线路建站点注册表,不可渲染线路的站点不进场景(避免孤立站点)
    const renderableIds = new Set(renderable.map((l) => l.id))
    const { stations } = buildStationRegistry(rawLines.filter((l) => renderableIds.has(l.id)))
    return createLineRenderer(
      viewer,
      renderable.map((l) => ({ id: l.id, name: l.name, positions: l.positions })),
      stations,
    )
  } catch (error) {
    console.warn('线路渲染加载失败:', error)
    return { lines: [], setLineVisible: () => {}, stop: () => {} }
  }
}

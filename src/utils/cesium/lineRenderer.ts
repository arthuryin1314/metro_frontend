import * as Cesium from 'cesium'
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

// 样式常量(科技蓝视觉风格)。
const LINE_WIDTH = 4
const LINE_OUTLINE_WIDTH = 2
const LINE_OUTLINE_COLOR = '#0a1a2b'
const STATION_PIXEL_SIZE = 10
const STATION_LABEL_MAX_DISTANCE = 3000 // 站名随镜头距离显示

/** 创建线路与站点实体;返回清理函数。空输入不创建任何地图对象。 */
export function createLineRenderer(
  viewer: Cesium.Viewer,
  lines: RenderableLine[],
  stations: RenderableStation[],
): () => void {
  if (lines.length === 0 && stations.length === 0) return () => {}
  const dataSource = new Cesium.CustomDataSource('metro-lines')
  viewer.dataSources.add(dataSource)

  for (const line of lines) {
    // 深色描边:下层宽线 + 上层官方色细线(PolylineGraphics 无原生描边)
    const positions = Cesium.Cartesian3.fromDegreesArray(line.positions.flat())
    dataSource.entities.add({
      polyline: {
        positions,
        width: LINE_WIDTH + LINE_OUTLINE_WIDTH * 2,
        material: Cesium.Color.fromCssColorString(LINE_OUTLINE_COLOR),
      },
    })
    dataSource.entities.add({
      polyline: {
        positions,
        width: LINE_WIDTH,
        material: Cesium.Color.fromCssColorString(resolveLineColor(line.id, line.name)),
      },
    })
  }
  for (const station of stations) {
    dataSource.entities.add({
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
  }

  return () => {
    if (!viewer.isDestroyed()) viewer.dataSources.remove(dataSource, true)
  }
}

/**
 * 首页级入口:请求线路数据 → 规范化 → 渲染。
 * 接口失败或返回空数组都作为正常空状态处理,不创建地图对象。
 */
export async function loadMetroLines(viewer: Cesium.Viewer): Promise<() => void> {
  try {
    // 动态导入:避免静态值依赖把 api/axios 链带进纯渲染模块
    const { getLine } = await import('@/api/line')
    const res = await getLine()
    const lines = normalizeLines(res.data.data)
    const { stations } = buildStationRegistry(res.data.data)
    const renderableLines = lines.filter((l) => l.renderable)
    return createLineRenderer(
      viewer,
      renderableLines.map((l) => ({ id: l.id, name: l.name, positions: l.positions })),
      stations,
    )
  } catch (error) {
    console.warn('线路渲染加载失败:', error)
    return () => {}
  }
}

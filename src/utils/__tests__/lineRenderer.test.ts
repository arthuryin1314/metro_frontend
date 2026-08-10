import test from 'node:test'
import assert from 'node:assert/strict'
import * as Cesium from 'cesium'
import { createLineRenderer } from '../cesium/lineRenderer.ts'
import { OFFICIAL_LINE_COLORS } from '../lineColor.ts'

// fake viewer:只暴露适配器用到的 dataSources 契约,验证创建与清理行为。
function makeFakeViewer() {
  const added: Cesium.CustomDataSource[] = []
  return {
    isDestroyed: () => false,
    dataSources: {
      add(ds: Cesium.CustomDataSource) {
        added.push(ds)
      },
      remove(ds: Cesium.CustomDataSource, destroy: boolean) {
        const i = added.indexOf(ds)
        if (i >= 0) added.splice(i, 1)
        void destroy
      },
    },
    added,
  }
}

type RenderLines = Parameters<typeof createLineRenderer>[1]
type RenderStations = Parameters<typeof createLineRenderer>[2]

const LINES = [
  {
    id: 1,
    name: '1号线',
    positions: [
      [114.329, 30.711],
      [114.33, 30.712],
    ],
  },
] as unknown as RenderLines
const STATIONS = [
  { name: '黄浦路', lng: 114.329481, lat: 30.711953, lineIds: [1] },
] as unknown as RenderStations

test('创建线路与站点实体:轨迹双线深色描边 + 官方色', () => {
  const viewer = makeFakeViewer()
  void createLineRenderer(viewer as unknown as Cesium.Viewer, LINES, STATIONS)
  assert.equal(viewer.added.length, 1)
  const entities = viewer.added[0]!.entities.values
  // 2 条 polyline(描边线 + 填充线)+ 1 个站点实体
  assert.equal(entities.length, 3)
  const polylines = entities.filter((e) => e.polyline)
  assert.equal(polylines.length, 2)
  const fill = polylines.find(
    (e) => (e.polyline!.width as Cesium.ConstantProperty).getValue() === 4,
  )!
  const outline = polylines.find(
    (e) => (e.polyline!.width as Cesium.ConstantProperty).getValue() === 8,
  )!
  assert.equal(
    (fill.polyline!.material as Cesium.ColorMaterialProperty).color
      .getValue()
      .toCssHexString()
      .toUpperCase(),
    OFFICIAL_LINE_COLORS[1]!.toUpperCase(),
  )
  assert.equal(
    (outline.polyline!.material as Cesium.ColorMaterialProperty).color
      .getValue()
      .toCssHexString()
      .toUpperCase(),
    '#0A1A2B',
  )
  const station = entities.find((e) => e.point)!
  assert.ok(station.point, '站点标记存在')
  assert.ok(station.label, '站名标签存在')
  assert.equal((station.label!.text as Cesium.ConstantProperty).getValue(), '黄浦路')
})

test('清理函数移除全部实体', () => {
  const viewer = makeFakeViewer()
  const stop = createLineRenderer(viewer as unknown as Cesium.Viewer, LINES, STATIONS)
  assert.equal(viewer.added[0]!.entities.values.length, 3)
  stop()
  assert.equal(viewer.added.length, 0, 'dataSource 已被移除')
})

test('空输入不创建任何地图对象', () => {
  const viewer = makeFakeViewer()
  const stop = createLineRenderer(viewer as unknown as Cesium.Viewer, [], [])
  assert.equal(viewer.added.length, 0, '空数组不添加 dataSource')
  stop() // 可安全重复清理
  stop()
})

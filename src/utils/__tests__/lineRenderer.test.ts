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
  const handle = createLineRenderer(viewer as unknown as Cesium.Viewer, LINES, STATIONS)
  assert.equal(viewer.added[0]!.entities.values.length, 3)
  handle.stop()
  assert.equal(viewer.added.length, 0, 'dataSource 已被移除')
})

test('空输入不创建任何地图对象', () => {
  const viewer = makeFakeViewer()
  const handle = createLineRenderer(viewer as unknown as Cesium.Viewer, [], [])
  assert.equal(viewer.added.length, 0, '空数组不添加 dataSource')
  handle.stop() // 可安全重复清理
  handle.stop()
  handle.setLineVisible(1, false) // 空句柄调用安全
  assert.deepEqual(handle.lines, [])
})

test('句柄暴露线路元数据与官方色', () => {
  const viewer = makeFakeViewer()
  const handle = createLineRenderer(viewer as unknown as Cesium.Viewer, LINES, STATIONS)
  assert.deepEqual(handle.lines, [{ id: 1, name: '1号线', color: OFFICIAL_LINE_COLORS[1] }])
})

test('setLineVisible 切换线路轨迹与独占站点,不影响换乘站', () => {
  const viewer = makeFakeViewer()
  const stations = [
    { name: '黄浦路', lng: 114.329481, lat: 30.711953, lineIds: [1] },
    { name: '换乘站', lng: 114.33, lat: 30.712, lineIds: [1, 2] },
  ] as unknown as RenderStations
  const handle = createLineRenderer(viewer as unknown as Cesium.Viewer, LINES, stations)
  handle.setLineVisible(1, false)
  const entities = viewer.added[0]!.entities.values
  for (const e of entities.filter((e) => e.polyline)) {
    assert.equal(e.show, false, '线路 1 轨迹实体隐藏')
  }
  const exclusive = entities.find((e) => e.point)!
  assert.equal(exclusive.show, false, '独占站点(标记+标签同一实体)隐藏')
  // 换乘站(1,2 号线共享)本 Ticket 不控制,保持可见
  const transfer = entities.filter((e) => e.point)
  assert.equal(transfer.length, 2)
  assert.equal(transfer[1]!.show, true, '换乘站保持可见')
  // 重新显示
  handle.setLineVisible(1, true)
  assert.equal(entities.find((e) => e.point)!.show, true, '独占站点恢复显示')
})

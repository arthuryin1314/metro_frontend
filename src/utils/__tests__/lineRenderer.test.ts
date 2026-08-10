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
// 双线路:换乘站共享显隐测试
const TWO_LINES = [
  ...(LINES as Array<{ id: number; name: string; positions: Array<[number, number]> }>),
  {
    id: 2,
    name: '2号线',
    positions: [
      [114.33, 30.712],
      [114.331, 30.713],
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
  const handle = createLineRenderer(viewer as unknown as Cesium.Viewer, TWO_LINES, stations)
  handle.setLineVisible(1, false)
  const entities = viewer.added[0]!.entities.values
  const polylines = entities.filter((e) => e.polyline)
  assert.equal(polylines.length, 4, '双线路各 2 条轨迹线')
  assert.equal(polylines.filter((e) => e.show === false).length, 2, '线路 1 轨迹实体隐藏')
  assert.equal(polylines.filter((e) => e.show === true).length, 2, '线路 2 轨迹保持可见')
  const exclusive = entities.find((e) => e.point)!
  assert.equal(exclusive.show, false, '独占站点(标记+标签同一实体)隐藏')
  // 换乘站(1,2 号线共享):2 号线仍可见,故保持可见
  const transfer = entities.filter((e) => e.point)
  assert.equal(transfer.length, 2)
  assert.equal(transfer[1]!.show, true, '换乘站保持可见')
  // 重新显示
  handle.setLineVisible(1, true)
  assert.equal(entities.find((e) => e.point)!.show, true, '独占站点恢复显示')
})

// 双线路站点集合:普通站 + 换乘站(1、2 号线共享)
const MIXED_STATIONS = [
  { name: '普通站', lng: 114.329481, lat: 30.711953, lineIds: [1] },
  { name: '换乘站', lng: 114.33, lat: 30.712, lineIds: [1, 2] },
] as unknown as RenderStations

function findByLabel(entities: Cesium.Entity[], text: string) {
  return entities.find(
    (e) => e.label && (e.label!.text as Cesium.ConstantProperty).getValue() === text,
  )!
}

test('换乘站单实体双环样式,普通站保持单环', () => {
  const viewer = makeFakeViewer()
  void createLineRenderer(viewer as unknown as Cesium.Viewer, TWO_LINES, MIXED_STATIONS)
  const entities = viewer.added[0]!.entities.values
  const plain = findByLabel(entities, '普通站')
  const transfer = findByLabel(entities, '换乘站')
  assert.equal(plain.ellipse, undefined, '普通站无外环')
  assert.ok(transfer.ellipse, '换乘站带外环(双环样式)')
  // 同一物理站点只渲染一个站点对象:换乘站恰好一个实体
  assert.equal(entities.filter((e) => e.label).length, 2, '两个站点各一个实体')
})

test('普通站与换乘站有各自的标签距离阈值,换乘站不小于普通站', () => {
  const viewer = makeFakeViewer()
  void createLineRenderer(viewer as unknown as Cesium.Viewer, TWO_LINES, MIXED_STATIONS)
  const entities = viewer.added[0]!.entities.values
  const plainFar = (
    findByLabel(entities, '普通站').label!.distanceDisplayCondition as Cesium.ConstantProperty
  ).getValue().far as number
  const transferFar = (
    findByLabel(entities, '换乘站').label!.distanceDisplayCondition as Cesium.ConstantProperty
  ).getValue().far as number
  assert.ok(transferFar >= plainFar, '换乘站可见距离不小于普通站')
})

test('换乘站共享显隐:隐藏一条仍可见,全部隐藏才隐藏,恢复任一即显示', () => {
  const viewer = makeFakeViewer()
  const handle = createLineRenderer(viewer as unknown as Cesium.Viewer, TWO_LINES, MIXED_STATIONS)
  const transfer = findByLabel(viewer.added[0]!.entities.values, '换乘站')
  handle.setLineVisible(1, false)
  assert.equal(transfer.show, true, '2 号线仍可见,换乘站保留')
  handle.setLineVisible(2, false)
  assert.equal(transfer.show, false, '全部所属线路隐藏,换乘站隐藏')
  handle.setLineVisible(2, true)
  assert.equal(transfer.show, true, '任意所属线路恢复,换乘站恢复显示')
})

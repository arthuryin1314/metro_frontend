import test from 'node:test'
import assert from 'node:assert/strict'
import * as Cesium from 'cesium'
import { createLineRenderer } from '../../cesiumTools/lineRenderer.ts'
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
  // 2 条 polyline(描边线 + 填充线)+ 1 组站点实体(地面标记、光锥、标签)
  assert.equal(entities.length, 5)
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
  const label = entities.find((e) => e.label)!
  assert.ok(station.point, '站点标记存在')
  assert.ok(label.label, '站名标签存在')
  assert.equal((label.label!.text as Cesium.ConstantProperty).getValue(), '黄浦路')
})

test('清理函数移除全部实体', () => {
  const viewer = makeFakeViewer()
  const handle = createLineRenderer(viewer as unknown as Cesium.Viewer, LINES, STATIONS)
  assert.equal(viewer.added[0]!.entities.values.length, 5)
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
  const exclusiveEntities = entities.filter(
    (e) => (e.properties?.stationName as Cesium.ConstantProperty | undefined)?.getValue() === '黄浦路',
  )
  assert.equal(exclusiveEntities.length, 3)
  assert.equal(exclusiveEntities.every((entity) => entity.show === false), true, '独占站点整组隐藏')
  // 换乘站(1,2 号线共享):2 号线仍可见,故保持可见
  const transfer = entities.filter((e) => e.point)
  assert.equal(transfer.length, 2)
  assert.equal(transfer[1]!.show, true, '换乘站保持可见')
  // 重新显示
  handle.setLineVisible(1, true)
  assert.equal(exclusiveEntities.every((entity) => entity.show === true), true, '独占站点整组恢复显示')
})

// 双线路站点集合:普通站 + 换乘站(1、2 号线共享)
const MIXED_STATIONS = [
  { name: '普通站', lng: 114.329481, lat: 30.711953, lineIds: [1] },
  { name: '换乘站', lng: 114.33, lat: 30.712, lineIds: [1, 2] },
] as unknown as RenderStations

function findByStation(
  entities: Cesium.Entity[],
  text: string,
  predicate: (entity: Cesium.Entity) => boolean = () => true,
) {
  return entities.find(
    (e) =>
      (e.properties?.stationName as Cesium.ConstantProperty | undefined)?.getValue() === text &&
      predicate(e),
  )!
}

function findByLabel(entities: Cesium.Entity[], text: string) {
  return findByStation(entities, text, (entity) => Boolean(entity.label))
}

test('站点统一 3D 光锥底座,换乘站保留外环双环样式', () => {
  const viewer = makeFakeViewer()
  void createLineRenderer(viewer as unknown as Cesium.Viewer, TWO_LINES, MIXED_STATIONS)
  const entities = viewer.added[0]!.entities.values
  const plain = findByStation(entities, '普通站', (entity) => Boolean(entity.cylinder))
  const transfer = findByStation(entities, '换乘站', (entity) => Boolean(entity.cylinder))
  const transferGround = findByStation(entities, '换乘站', (entity) => Boolean(entity.ellipse))
  assert.ok(plain.cylinder, '普通站带 3D 光锥底座')
  assert.ok(plain.cylinder!.material, '光锥使用自定义材质')
  assert.ok(transfer.cylinder, '换乘站也带 3D 光锥底座')
  assert.ok(transferGround.ellipse, '换乘站保留外环(双环样式)')
  // 同一物理站点保留一组可独立定位的视觉实体
  assert.equal(entities.filter((e) => e.label).length, 2, '两个站点各一个标签实体')
})

test('光锥底面贴地,标签和 popup 锚点高于锥顶', () => {
  const viewer = makeFakeViewer()
  void createLineRenderer(viewer as unknown as Cesium.Viewer, LINES, [
    { name: '诊断站', lng: 114.329481, lat: 30.711953, lineIds: [1], surfaceHeight: 50 },
  ] as unknown as RenderStations)
  const entities = viewer.added[0]!.entities.values
  const time = Cesium.JulianDate.now()
  const ground = findByStation(entities, '诊断站', (entity) => Boolean(entity.point))
  const cone = findByStation(entities, '诊断站', (entity) => Boolean(entity.cylinder))
  const label = findByStation(entities, '诊断站', (entity) => Boolean(entity.label))
  const groundHeight = Cesium.Cartographic.fromCartesian(ground.position!.getValue(time)).height
  const coneCenterHeight = Cesium.Cartographic.fromCartesian(cone.position!.getValue(time)).height
  const labelHeight = Cesium.Cartographic.fromCartesian(label.position!.getValue(time)).height
  const coneLength = (cone.cylinder!.length as Cesium.ConstantProperty).getValue(time)
  const popupPosition = (
    cone.properties!.popupPosition as Cesium.ConstantProperty
  ).getValue(time)
  const popupHeight = Cesium.Cartographic.fromCartesian(popupPosition).height

  assert.ok(Math.abs(coneCenterHeight - coneLength / 2 - groundHeight) < 1e-6)
  assert.ok(labelHeight > coneCenterHeight + coneLength / 2)
  assert.ok(popupHeight > coneCenterHeight + coneLength / 2)
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

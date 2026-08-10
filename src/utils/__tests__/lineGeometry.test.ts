import test from 'node:test'
import assert from 'node:assert/strict'
import {
  gcj02ToWgs84,
  parseLineTrace,
  parseStationCoords,
  buildStationRegistry,
  normalizeLines,
} from '../lineGeometry.ts'

// 真实接口样例
const REAL_XS = '114.329481,114.330007,114.331744'
const REAL_YS = '30.711953,30.711385,30.709554'
const REAL_XY = '114.329481;30.711953'

test('真实样例轨迹按索引配对并转为 WGS84', () => {
  const result = parseLineTrace(REAL_XS, REAL_YS)
  if (!('positions' in result)) throw new Error('应解析成功')
  assert.equal(result.positions.length, 3)
  // 转换后与 GCJ-02 输入接近(偏移约百米级)且不再相等
  for (const [lon, lat] of result.positions) {
    assert.ok(Number.isFinite(lon) && Number.isFinite(lat))
    assert.ok(Math.abs(lon - Number(REAL_XS.split(',')[0])) < 0.01)
    assert.ok(Math.abs(lat - Number(REAL_YS.split(',')[0])) < 0.01)
  }
  assert.notDeepEqual(result.positions[0], [
    Number(REAL_XS.split(',')[0]),
    Number(REAL_YS.split(',')[0]),
  ])
})

test('轨迹横纵坐标数量不一致返回显式原因', () => {
  const result = parseLineTrace('114.32,114.33', '30.71')
  assert.deepEqual(result, { reason: '轨迹横纵坐标数量不一致' })
})

test('轨迹包含不可解析坐标返回显式原因', () => {
  assert.deepEqual(parseLineTrace('abc,114.33', '30.71,30.72'), { reason: '轨迹坐标不可解析' })
  assert.deepEqual(parseLineTrace('114.32,200', '30.71,30.72'), { reason: '轨迹坐标不可解析' })
})

test('少于 2 个有效点返回显式原因', () => {
  assert.deepEqual(parseLineTrace('114.32', '30.71'), { reason: '有效坐标点不足 2 个' })
})

test('真实样例站点坐标解析为 WGS84', () => {
  const pos = parseStationCoords(REAL_XY)
  if (!pos) throw new Error('应解析成功')
  const [lon, lat] = gcj02ToWgs84(114.329481, 30.711953)
  assert.ok(Math.abs(pos[0] - lon) < 1e-9)
  assert.ok(Math.abs(pos[1] - lat) < 1e-9)
})

test('无效站点坐标返回 null', () => {
  assert.equal(parseStationCoords('abc;30.7'), null)
  assert.equal(parseStationCoords('114.3'), null)
  assert.equal(parseStationCoords(''), null)
})

test('坐标转换确定性且偏移在合理范围', () => {
  const [lon, lat] = gcj02ToWgs84(114.329481, 30.711953)
  assert.ok(Number.isFinite(lon) && Number.isFinite(lat))
  assert.ok(Math.abs(lon - 114.329481) < 0.01)
  assert.ok(Math.abs(lat - 30.711953) < 0.01)
  assert.notEqual(lon, 114.329481)
  // 同一输入结果一致
  assert.deepEqual(gcj02ToWgs84(114.329481, 30.711953), [lon, lat])
})

test('相同物理站点跨线路合并,所属线路累积', () => {
  const lines = [
    { id: 1, stationsList: [{ name: ' 黄浦路 ', xy_coords: '114.329481;30.711953' }] },
    { id: 2, stationsList: [{ name: '黄浦路', xy_coords: '114.32949;30.71196' }] },
  ]
  const { stations, skipped } = buildStationRegistry(lines)
  assert.equal(skipped, 0)
  assert.equal(stations.length, 1)
  assert.equal(stations[0]!.name, '黄浦路') // 站名规范化
  assert.deepEqual(stations[0]!.lineIds, [1, 2]) // 换乘站
})

test('同名但坐标相距较远视为不同物理站点', () => {
  const lines = [
    { id: 1, stationsList: [{ name: '广场', xy_coords: '114.329481;30.711953' }] },
    { id: 2, stationsList: [{ name: '广场', xy_coords: '114.5;30.7' }] },
  ]
  const { stations } = buildStationRegistry(lines)
  assert.equal(stations.length, 2)
})

test('无效站点坐标被跳过并计数,不阻断其他站点', () => {
  const lines = [
    {
      id: 1,
      stationsList: [
        { name: '坏站', xy_coords: 'oops;30.7' },
        { name: '好站', xy_coords: '114.329481;30.711953' },
      ],
    },
  ]
  const { stations, skipped } = buildStationRegistry(lines)
  assert.equal(skipped, 1)
  assert.equal(stations.length, 1)
})

test('normalizeLines 标记坏轨迹为不可渲染', () => {
  const lines = [
    { id: 1, name: '1号线', xs: REAL_XS, ys: REAL_YS },
    { id: 9, name: '9号线', xs: '114.32', ys: '30.71,30.72' },
  ] as unknown as Parameters<typeof normalizeLines>[0]
  const parsed = normalizeLines(lines)
  assert.equal(parsed.length, 2)
  assert.equal(parsed[0]!.renderable, true)
  assert.equal(parsed[1]!.renderable, false)
  assert.ok(parsed[1]!.reason)
})

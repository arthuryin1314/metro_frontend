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

test('空坐标字符串不被解析为 [0,0](Number("")===0 陷阱)', () => {
  assert.deepEqual(parseLineTrace(',114.3', '30.7,30.8'), { reason: '轨迹坐标不可解析' })
  assert.deepEqual(parseLineTrace('114.3,', '30.7,30.8'), { reason: '轨迹坐标不可解析' })
  assert.equal(parseStationCoords(';'), null)
  assert.equal(parseStationCoords('114.3;'), null)
  assert.equal(parseStationCoords('  '), null)
})

test('非严格数值格式(十六进制/科学计数法)被拒绝', () => {
  assert.deepEqual(parseLineTrace('0x10,114.3', '30.7,30.8'), { reason: '轨迹坐标不可解析' })
  assert.equal(parseStationCoords('1e3;30.7'), null)
})

test('站点坐标多余分隔符被拒绝,不静默丢弃', () => {
  assert.equal(parseStationCoords('114.3;30.7;999'), null)
})

test('缺少轨迹坐标的线路标记为不可渲染,不拖垮其他线路', () => {
  const lines = [
    { id: 1, name: '1号线', xs: REAL_XS, ys: REAL_YS },
    { id: 9, name: '9号线' },
    { id: 10, name: '10号线', xs: null, ys: null },
  ] as unknown as Parameters<typeof normalizeLines>[0]
  const parsed = normalizeLines(lines)
  assert.equal(parsed.length, 3)
  assert.equal(parsed[0]!.renderable, true)
  assert.equal(parsed[1]!.renderable, false)
  assert.equal(parsed[2]!.renderable, false)
  assert.ok(parsed[1]!.reason)
})

test('缺失站点列表/站名/坐标的线路不抛异常,其余站点正常注册', () => {
  const lines = [
    { id: 1, stationsList: [{ name: '好站', xy_coords: REAL_XY }] },
    { id: 2 },
    { id: 3, stationsList: [{ xy_coords: REAL_XY }, { name: '无坐标站' }] },
  ]
  const { stations, skipped } = buildStationRegistry(lines)
  assert.equal(skipped, 2) // 无站名 + 无坐标
  assert.equal(stations.length, 1)
  assert.equal(stations[0]!.name, '好站')
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
  const { stations, skipped, skippedByLine } = buildStationRegistry(lines)
  assert.equal(skipped, 1)
  assert.equal(skippedByLine.get(1), 1)
  assert.equal(stations.length, 1)
})

test('坏站点按线路归属计数,供警告去重', () => {
  const lines = [
    { id: 1, stationsList: [{ name: '坏站', xy_coords: 'oops;30.7' }] },
    { id: 2, stationsList: [{ name: '坏站', xy_coords: 'oops;30.7' }] },
    { id: 3, stationsList: [{ name: '好站', xy_coords: '114.329481;30.711953' }] },
  ]
  const { stations, skipped, skippedByLine } = buildStationRegistry(lines)
  assert.equal(skipped, 2)
  assert.equal(skippedByLine.get(1), 1)
  assert.equal(skippedByLine.get(2), 1)
  assert.equal(skippedByLine.get(3), undefined)
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

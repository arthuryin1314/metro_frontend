import test from 'node:test'
import assert from 'node:assert/strict'
import { OFFICIAL_LINE_COLORS, resolveLineColor } from '../lineColor.ts'
import { buildLineBarDataset } from '../../chartConfig/operationChart.ts'

// 已知线路始终返回固定官方色,不使用随机色。
test('已知 1-8 号线返回固定官方色', () => {
  for (const [n, color] of Object.entries(OFFICIAL_LINE_COLORS)) {
    assert.equal(resolveLineColor(Number(n), `${n}号线`), color)
    // ID 与名称缺一不可时另一侧兜底仍命中官方色
    assert.equal(resolveLineColor(Number(n), '任意名称'), color)
    assert.equal(resolveLineColor(999, `${n}号线`), color)
  }
})

// 未知线路按稳定输入生成确定性备用色:同一输入跨调用保持一致。
test('未知线路颜色确定性且不落在官方色上', () => {
  const inputs: Array<[number | string, string]> = [
    [9, '9号线'],
    [100, '机场线'],
    [11, '11号线'],
    [9999, '新洲线(规划)'],
  ]
  for (const [id, name] of inputs) {
    const a = resolveLineColor(id, name)
    const b = resolveLineColor(id, name)
    assert.equal(a, b, `同一输入 ${id}:${name} 跨调用应一致`)
    assert.ok(
      !Object.values(OFFICIAL_LINE_COLORS).includes(a),
      `${id}:${name} 备用色不应与官方色重复`,
    )
  }
})

// 运营统计图颜色接入:数据集颜色来自共享解析器,且确定性稳定。
test('运营统计数据集使用共享官方线路色解析器', () => {
  const lines = [
    {
      id: 1,
      name: '1号线',
      length: '32.5',
      basicPrice: '',
      totalPrice: '',
      xs: '',
      ys: '',
      stationsList: [],
    },
    {
      id: 9,
      name: '9号线',
      length: '21.4',
      basicPrice: '',
      totalPrice: '',
      xs: '',
      ys: '',
      stationsList: [],
    },
  ]
  const dataset = buildLineBarDataset(lines)
  assert.equal(dataset.length, 2)
  assert.equal(dataset[0]!.color, OFFICIAL_LINE_COLORS[1])
  assert.equal(dataset[0]!.value, 33) // 长度取整
  assert.equal(dataset[1]!.color, resolveLineColor(9, '9号线'))
  // 相同输入两次构建,颜色保持一致(替代原 Math.random 行为)
  assert.deepEqual(
    buildLineBarDataset(lines).map((d) => d.color),
    dataset.map((d) => d.color),
  )
})

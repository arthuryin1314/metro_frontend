import test from 'node:test'
import assert from 'node:assert/strict'
import { sortLinesNaturally } from '../lineSort.ts'

test('按名称编号自然排序(11 在 3 之后)', () => {
  const sorted = sortLinesNaturally([
    { name: '11号线' },
    { name: '2号线' },
    { name: '1号线' },
    { name: '3号线' },
  ])
  assert.deepEqual(
    sorted.map((l) => l.name),
    ['1号线', '2号线', '3号线', '11号线'],
  )
})

test('无编号名称排在数字线路之后', () => {
  const sorted = sortLinesNaturally([{ name: '机场快线' }, { name: '2号线' }, { name: '1号线' }])
  assert.deepEqual(
    sorted.map((l) => l.name),
    ['1号线', '2号线', '机场快线'],
  )
})

test('不修改原数组', () => {
  const lines = [{ name: '2号线' }, { name: '1号线' }]
  sortLinesNaturally(lines)
  assert.deepEqual(
    lines.map((l) => l.name),
    ['2号线', '1号线'],
  )
})

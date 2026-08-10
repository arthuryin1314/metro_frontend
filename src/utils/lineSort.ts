/**
 * 线路自然排序:按名称中的首个连续数字排序(1、2、…、11、12),
 * 无法提取编号的名称排在数字线路之后,并保持稳定次序。
 */

function firstLineNumber(name: string): number {
  const m = name.match(/\d+/)
  return m ? Number(m[0]) : Number.POSITIVE_INFINITY
}

/** 返回按自然编号排序的新数组,不修改原数组。 */
export function sortLinesNaturally<T extends { name: string }>(lines: readonly T[]): T[] {
  return [...lines].sort(
    (a, b) => firstLineNumber(a.name) - firstLineNumber(b.name) || a.name.localeCompare(b.name),
  )
}

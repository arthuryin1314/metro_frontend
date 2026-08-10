/**
 * 官方线路色解析器 —— 地图、线路清单与运营统计共用的唯一线路色入口。
 *
 * 官方色来源:
 * - 武汉市交通运输局 2024-12-27 发布的武汉轨道交通线网图
 *   https://jtj.wuhan.gov.cn/jtzx/zwdt/202412/W020241227526164200099.png
 * - 维基百科《武汉地铁颜色》模板(色值源自武汉地铁官方公众号「2022 全家福」)
 * 采集日期: 2026-08-10
 */
export const OFFICIAL_LINE_COLORS: Readonly<Record<number, string>> = {
  1: '#0067a1', // 地铁蓝
  2: '#ec9cbb', // 梅花红
  3: '#d3b466', // 归元金
  4: '#a6d30b', // 芳草绿
  5: '#a43034', // 首义红
  6: '#007128', // 鹦鹉绿
  7: '#eb7c16', // 凤凰橙
  8: '#9dabaa', // 编钟青
}

// 未知线路的确定性备用色调色板,与官方色互不重复。
const FALLBACK_PALETTE = [
  '#5b8ff9',
  '#f6bd16',
  '#6dc8ec',
  '#e8684a',
  '#9270ca',
  '#33a02c',
  '#ff7f0e',
  '#1f78b4',
]

/** 从线路 ID 或名称提取 1-8 号线号;取不到返回 null。 */
function extractLineNumber(id: number | string, name: string): number | null {
  if (/^\d+$/.test(String(id))) {
    const n = Number(id)
    if (n >= 1 && n <= 8) return n
  }
  const m = name.match(/\d+/)
  if (m) {
    const n = Number(m[0])
    if (n >= 1 && n <= 8) return n
  }
  return null
}

// FNV-1a 32 位哈希:纯字符串运算,输入稳定则输出稳定。
function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * 解析线路官方颜色。
 * 已知线路(1-8 号线)始终返回固定官方色;未知线路按稳定线路 ID/规范化
 * 名称生成确定性备用色,同一输入跨刷新保持一致,不使用随机色。
 */
export function resolveLineColor(id: number | string, name: string): string {
  const n = extractLineNumber(id, name)
  if (n !== null) return OFFICIAL_LINE_COLORS[n]! // n ∈ [1,8] 且表覆盖 1-8
  const key = `${id}:${name.replace(/\s+/g, '')}`
  return FALLBACK_PALETTE[fnv1a(key) % FALLBACK_PALETTE.length]!
}

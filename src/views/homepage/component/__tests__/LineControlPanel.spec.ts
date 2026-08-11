import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LineControlPanel from '../LineControlPanel.vue'
import type { LineMeta, LineRenderHandle } from '@/cesiumTools/lineRenderer'

beforeEach(() => {
  sessionStorage.clear()
})

// 功能级测试缝:挂载面板,模拟地图渲染适配器句柄,从用户可见行为与句柄调用验证结果。
function makeHandle(lines: LineMeta[]) {
  const calls: string[] = []
  const handle: LineRenderHandle = {
    lines,
    setLineVisible(id, visible) {
      calls.push(`setLineVisible:${id}:${visible}`)
    },
    stop() {
      calls.push('stop')
    },
  }
  return { handle, calls }
}

const UNSORTED_LINES = [
  { id: 11, name: '11号线', color: '#000000' },
  { id: 2, name: '2号线', color: '#ec9cbb' },
  { id: 1, name: '1号线', color: '#0067a1' },
]

describe('LineControlPanel', () => {
  it('默认折叠,展开后才显示线路清单', async () => {
    const { handle } = makeHandle(UNSORTED_LINES)
    const wrapper = mount(LineControlPanel, { props: { handle } })
    expect(wrapper.find('.line-control__panel').exists()).toBe(false)
    await wrapper.find('.line-control__toggle').trigger('click')
    expect(wrapper.find('.line-control__panel').exists()).toBe(true)
  })

  it('清单按自然编号排序,每行显示色块与名称', async () => {
    const { handle } = makeHandle(UNSORTED_LINES)
    const wrapper = mount(LineControlPanel, { props: { handle } })
    await wrapper.find('.line-control__toggle').trigger('click')
    const names = wrapper.findAll('.line-control__name').map((n) => n.text())
    expect(names).toEqual(['1号线', '2号线', '11号线'])
    const swatches = wrapper.findAll('.line-control__swatch')
    expect(swatches[0]!.attributes('style')).toContain('#0067a1')
    expect(swatches[1]!.attributes('style')).toContain('#ec9cbb')
  })

  it('整行点击切换显隐并调用适配器,隐藏行降亮度', async () => {
    const { handle, calls } = makeHandle(UNSORTED_LINES)
    const wrapper = mount(LineControlPanel, { props: { handle } })
    await wrapper.find('.line-control__toggle').trigger('click')
    const rows = wrapper.findAll('.line-control__row')
    await rows[2]!.trigger('click') // 11号线
    expect(calls).toEqual(['setLineVisible:11:false'])
    expect(rows[2]!.classes()).toContain('is-hidden')
    await rows[2]!.trigger('click')
    expect(calls).toEqual(['setLineVisible:11:false', 'setLineVisible:11:true'])
    expect(rows[2]!.classes()).not.toContain('is-hidden')
  })

  it('显隐操作不调用清理或任何其他适配器方法(无相机动作)', async () => {
    const { handle, calls } = makeHandle(UNSORTED_LINES)
    const wrapper = mount(LineControlPanel, { props: { handle } })
    await wrapper.find('.line-control__toggle').trigger('click')
    await wrapper.findAll('.line-control__row')[0]!.trigger('click')
    expect(calls).toEqual(['setLineVisible:1:false'])
  })

  it('三态全选:全部可见为勾选,部分可见为 indeterminate,全部隐藏为未勾选', async () => {
    const { handle } = makeHandle(UNSORTED_LINES)
    const wrapper = mount(LineControlPanel, { props: { handle } })
    await wrapper.find('.line-control__toggle').trigger('click')
    const checkbox = wrapper.find('.line-control__select-all-input')
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    expect((checkbox.element as HTMLInputElement).indeterminate).toBe(false)
    // 隐藏一条 → 半选
    await wrapper.findAll('.line-control__row')[0]!.trigger('click')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
    expect((checkbox.element as HTMLInputElement).indeterminate).toBe(true)
    // 全部隐藏 → 未勾选
    await wrapper.findAll('.line-control__row')[1]!.trigger('click')
    await wrapper.findAll('.line-control__row')[2]!.trigger('click')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
    expect((checkbox.element as HTMLInputElement).indeterminate).toBe(false)
  })

  it('全选控件一次显示全部或隐藏全部,并显示可见数/总数', async () => {
    const { handle, calls } = makeHandle(UNSORTED_LINES)
    const wrapper = mount(LineControlPanel, { props: { handle } })
    await wrapper.find('.line-control__toggle').trigger('click')
    expect(wrapper.find('.line-control__count').text()).toBe('3/3')
    // 隐藏 11 号线 → 2/3
    await wrapper.findAll('.line-control__row')[2]!.trigger('click')
    expect(wrapper.find('.line-control__count').text()).toBe('2/3')
    // 未全部可见 → 点击全选控件恢复全部(逐线显式置可见,幂等)
    await wrapper.find('.line-control__select-all-input').trigger('click')
    expect(calls).toEqual([
      'setLineVisible:11:false',
      'setLineVisible:1:true',
      'setLineVisible:2:true',
      'setLineVisible:11:true',
    ])
    expect(wrapper.find('.line-control__count').text()).toBe('3/3')
    // 全部可见 → 点击全选控件隐藏全部
    await wrapper.find('.line-control__select-all-input').trigger('click')
    expect(calls.at(-3)).toBe('setLineVisible:1:false')
    expect(calls.at(-2)).toBe('setLineVisible:2:false')
    expect(calls.at(-1)).toBe('setLineVisible:11:false')
    expect(wrapper.find('.line-control__count').text()).toBe('0/3')
  })

  it('会话恢复:刷新重新挂载后保留显隐,隐藏线路同步到渲染器', async () => {
    const { handle, calls } = makeHandle(UNSORTED_LINES)
    const first = mount(LineControlPanel, { props: { handle } })
    await first.find('.line-control__toggle').trigger('click')
    await first.findAll('.line-control__row')[2]!.trigger('click') // 隐藏 11 号线
    first.unmount()
    // 模拟刷新:同一标签页 sessionStorage 仍在,重新挂载
    const second = mount(LineControlPanel, { props: { handle } })
    await second.find('.line-control__toggle').trigger('click')
    const rows = second.findAll('.line-control__row')
    expect(rows[2]!.classes()).toContain('is-hidden')
    expect(second.find('.line-control__count').text()).toBe('2/3')
    expect(calls).toEqual(['setLineVisible:11:false', 'setLineVisible:11:false'])
  })

  it('关闭标签页清除会话:无存储时重新挂载恢复默认全部可见', async () => {
    const { handle, calls } = makeHandle(UNSORTED_LINES)
    const first = mount(LineControlPanel, { props: { handle } })
    await first.find('.line-control__toggle').trigger('click')
    await first.findAll('.line-control__row')[2]!.trigger('click')
    first.unmount()
    sessionStorage.clear() // 等价关闭标签页的自然清除
    const second = mount(LineControlPanel, { props: { handle } })
    await second.find('.line-control__toggle').trigger('click')
    expect(second.find('.line-control__count').text()).toBe('3/3')
    expect(
      second.findAll('.line-control__row').some((r) => r.classes().includes('is-hidden')),
    ).toBe(false)
    expect(calls).toEqual(['setLineVisible:11:false'])
  })

  it('恢复时忽略失效线路 ID,新出现的线路默认可见', async () => {
    sessionStorage.setItem(
      'metro-line-visibility',
      JSON.stringify({ 11: false, 999: false }), // 999 已失效
    )
    const { handle, calls } = makeHandle(UNSORTED_LINES)
    const wrapper = mount(LineControlPanel, { props: { handle } })
    await wrapper.find('.line-control__toggle').trigger('click')
    expect(wrapper.find('.line-control__count').text()).toBe('2/3')
    // 999 未触发任何调用;11 恢复为隐藏并同步
    expect(calls).toEqual(['setLineVisible:11:false'])
  })

  it('会话值严格布尔校验:字符串/数字/null 视为无效,默认可见且不同步渲染器', async () => {
    sessionStorage.setItem(
      'metro-line-visibility',
      JSON.stringify({ 1: 'false', 2: 0, 11: null }), // 均非布尔,全部无效
    )
    const { handle, calls } = makeHandle(UNSORTED_LINES)
    const wrapper = mount(LineControlPanel, { props: { handle } })
    await wrapper.find('.line-control__toggle').trigger('click')
    expect(wrapper.find('.line-control__count').text()).toBe('3/3')
    expect(calls).toEqual([]) // 无任何隐藏同步
  })

  it('0 条线路:显示 0/0、禁用全选与空数据提示,不自动展开', async () => {
    const { handle } = makeHandle([])
    const wrapper = mount(LineControlPanel, { props: { handle } })
    expect(wrapper.find('.line-control__panel').exists()).toBe(false) // 不自动展开
    await wrapper.find('.line-control__toggle').trigger('click')
    expect(wrapper.find('.line-control__count').text()).toBe('0/0')
    expect(
      (wrapper.find('.line-control__select-all-input').element as HTMLInputElement).disabled,
    ).toBe(true)
    expect(wrapper.find('.line-control__empty').text()).toBe('暂无线线路数据')
  })

  it('请求进行中显示明确加载态', async () => {
    const wrapper = mount(LineControlPanel, { props: { handle: null, loading: true } })
    await wrapper.find('.line-control__toggle').trigger('click')
    expect(wrapper.find('.line-control__state').text()).toContain('线路加载中')
  })

  it('首次请求失败自动展开,展示失败信息并可重试', async () => {
    const retry = vi.fn()
    const wrapper = mount(LineControlPanel, {
      props: { handle: null, error: '线路数据加载失败,请重试', onRetry: retry },
    })
    // 无需点击展开按钮:失败自动展开
    expect(wrapper.find('.line-control__panel').exists()).toBe(true)
    expect(wrapper.find('.line-control__state--error').text()).toContain('线路数据加载失败')
    await wrapper.find('.line-control__retry').trigger('click')
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('重试成功后恢复正常列表,并保持失败时的展开状态', async () => {
    const { handle } = makeHandle(UNSORTED_LINES)
    const wrapper = mount(LineControlPanel, {
      props: { handle: null, error: '线路数据加载失败,请重试', onRetry: vi.fn() },
    })
    expect(wrapper.find('.line-control__panel').exists()).toBe(true) // 失败自动展开
    await wrapper.setProps({ error: null, handle })
    // 面板保持展开,列表恢复正常
    expect(wrapper.find('.line-control__panel').exists()).toBe(true)
    expect(wrapper.findAll('.line-control__row')).toHaveLength(3)
    expect(wrapper.find('.line-control__count').text()).toBe('3/3')
  })

  it('折叠入口只显示图层图标,展开后显示线路计数与异常数', async () => {
    const { handle } = makeHandle(UNSORTED_LINES)
    const wrapper = mount(LineControlPanel, { props: { handle } })
    expect(wrapper.find('.line-control__toggle .icon-layer').exists()).toBe(true)
    expect(wrapper.find('.line-control__toggle').text()).toBe('')
    expect(wrapper.find('.line-control__toggle').attributes('aria-label')).toBe('线路图层')
    expect(wrapper.find('.line-control__toggle').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.line-control__toggle-count').exists()).toBe(false)
    await wrapper.find('.line-control__toggle').trigger('click')
    expect(wrapper.find('.line-control__toggle').attributes('aria-expanded')).toBe('true')
    await wrapper.findAll('.line-control__row')[0]!.trigger('click')
    expect(wrapper.find('.line-control__count').text()).toBe('2/3')
    expect(wrapper.find('.line-control__issue').exists()).toBe(false) // 无异常不显示
  })

  it('坏站点警告:轨迹可渲染的线路保持可操作并显示警告原因,计为异常', async () => {
    const lines: LineMeta[] = [
      { id: 1, name: '1号线', color: '#0067a1', warning: '跳过 2 个坏站点' },
      { id: 2, name: '2号线', color: '#ec9cbb' },
    ]
    const { handle, calls } = makeHandle(lines)
    const wrapper = mount(LineControlPanel, { props: { handle } })
    await wrapper.find('.line-control__toggle').trigger('click')
    expect(wrapper.find('.line-control__warning').text()).toBe('跳过 2 个坏站点')
    // 警告行仍可切换显隐
    await wrapper.findAll('.line-control__row')[0]!.trigger('click')
    expect(calls).toEqual(['setLineVisible:1:false'])
    expect(wrapper.find('.line-control__count').text()).toBe('1/2')
    expect(wrapper.find('.line-control__issue').text()).toBe('异常1')
  })

  it('不可渲染线路禁用并显示原因,不计入可渲染总数', async () => {
    const lines: LineMeta[] = [
      { id: 1, name: '1号线', color: '#0067a1' },
      {
        id: 9,
        name: '9号线',
        color: '#8a94a6',
        renderable: false,
        reason: '轨迹横纵坐标数量不一致',
      },
    ]
    const { handle, calls } = makeHandle(lines)
    const wrapper = mount(LineControlPanel, { props: { handle } })
    await wrapper.find('.line-control__toggle').trigger('click')
    expect(wrapper.find('.line-control__count').text()).toBe('1/1') // 不可渲染不计入总数
    const row = wrapper.findAll('.line-control__row')[1]!
    expect((row.element as HTMLButtonElement).disabled).toBe(true)
    expect(row.classes()).toContain('is-disabled')
    expect(row.find('.line-control__reason').text()).toBe('轨迹横纵坐标数量不一致')
    await row.trigger('click') // 禁用行不触发任何调用
    expect(calls).toEqual([])
    expect(wrapper.find('.line-control__issue').text()).toBe('异常1')
  })

  it('任一异常线路不阻断其他有效线路的加载和显隐', async () => {
    const lines: LineMeta[] = [
      { id: 1, name: '1号线', color: '#0067a1' },
      { id: 9, name: '9号线', color: '#8a94a6', renderable: false, reason: '轨迹坐标不可解析' },
      { id: 2, name: '2号线', color: '#ec9cbb' },
    ]
    const { handle, calls } = makeHandle(lines)
    const wrapper = mount(LineControlPanel, { props: { handle } })
    await wrapper.find('.line-control__toggle').trigger('click')
    await wrapper.findAll('.line-control__row')[0]!.trigger('click')
    expect(calls).toEqual(['setLineVisible:1:false'])
    expect(wrapper.find('.line-control__count').text()).toBe('1/2')
    // 自然排序后第 2 行是 2 号线(第 3 行是禁用的 9 号线)
    await wrapper.findAll('.line-control__row')[1]!.trigger('click')
    expect(calls).toEqual(['setLineVisible:1:false', 'setLineVisible:2:false'])
    expect(wrapper.find('.line-control__count').text()).toBe('0/2')
  })

  it('异常线路数按受影响线路去重计数,每条最多计 1', async () => {
    const lines: LineMeta[] = [
      { id: 1, name: '1号线', color: '#0067a1', warning: '跳过 1 个坏站点' },
      { id: 9, name: '9号线', color: '#8a94a6', renderable: false, reason: '有效坐标点不足 2 个' },
      { id: 2, name: '2号线', color: '#ec9cbb' },
    ]
    const { handle } = makeHandle(lines)
    const wrapper = mount(LineControlPanel, { props: { handle } })
    expect(wrapper.find('.line-control__issue').exists()).toBe(false)
    await wrapper.find('.line-control__toggle').trigger('click')
    expect(wrapper.find('.line-control__issue').text()).toBe('异常2')
  })

  it('空数组不是失败:不自动展开、无异常计数', async () => {
    const { handle } = makeHandle([])
    const wrapper = mount(LineControlPanel, { props: { handle } })
    expect(wrapper.find('.line-control__panel').exists()).toBe(false) // 不自动展开
    expect(wrapper.find('.line-control__toggle').text()).toBe('')
    expect(wrapper.find('.line-control__issue').exists()).toBe(false)
    await wrapper.find('.line-control__toggle').trigger('click')
    expect(wrapper.find('.line-control__count').text()).toBe('0/0')
  })
})

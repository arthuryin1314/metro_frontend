import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LineControlPanel from '../LineControlPanel.vue'
import type { LineRenderHandle } from '@/utils/cesium/lineRenderer'

// 功能级测试缝:挂载面板,模拟地图渲染适配器句柄,从用户可见行为与句柄调用验证结果。
function makeHandle(lines: Array<{ id: number; name: string; color: string }>) {
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
})

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LineRenderHandle } from '@/utils/cesium/lineRenderer'
import { sortLinesNaturally } from '@/utils/lineSort'

const props = defineProps<{
  handle: LineRenderHandle | null
  /** 线路数据请求进行中。 */
  loading?: boolean
  /** 首次请求失败信息;存在时面板自动展开并显示重试。 */
  error?: string | null
  /** 重试整批线路请求;由首页持有请求能力。 */
  onRetry?: () => void
}>()

// 会话恢复:仅当前标签页内生效,关闭标签页由 sessionStorage 自然清除。
const STORAGE_KEY = 'metro-line-visibility'

function loadVisibility(lines: Array<{ id: number }>): Record<number, boolean> {
  const saved: Record<number, boolean> = {}
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          // 严格布尔校验:0/null/字符串等非布尔值视为无效,不进入恢复状态
          if (typeof value === 'boolean') saved[Number(key)] = value
        }
      }
    }
  } catch {
    // ponytail: 损坏数据按无存储处理,全部默认可见
  }
  const result: Record<number, boolean> = {}
  for (const line of lines) {
    // 新出现且可渲染的线路默认可见;已失效线路 ID 不读取,自然忽略
    result[line.id] = saved[line.id] ?? true
  }
  return result
}

function saveVisibility() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(visible.value))
  } catch {
    // 存储不可用不影响页面功能
  }
}

const expanded = ref(false)
// 显隐状态:线路 ID → 可见。首次进入全部可见,之后从会话恢复。
const visible = ref<Record<number, boolean>>({})

watch(
  () => props.handle,
  (handle) => {
    if (!handle) return
    visible.value = loadVisibility(handle.lines)
    // 渲染器创建时全部默认显示;恢复出的隐藏线路同步过去,保持一致
    for (const line of handle.lines) {
      if (visible.value[line.id] === false) handle.setLineVisible(line.id, false)
    }
  },
  { immediate: true },
)

const sortedLines = computed(() => sortLinesNaturally(props.handle?.lines ?? []))
// 计数口径:可见数/可渲染总数;不可渲染线路不计入总数,但计入异常数。
const renderableLines = computed(() => sortedLines.value.filter((l) => l.renderable !== false))
const total = computed(() => renderableLines.value.length)
const visibleCount = computed(
  () => renderableLines.value.filter((line) => visible.value[line.id]).length,
)
// 异常线路数:不可渲染或含坏站点警告的线路,每条最多计 1(去重)。
const issueCount = computed(
  () => sortedLines.value.filter((l) => l.renderable === false || l.warning !== undefined).length,
)
const allVisible = computed(() => total.value > 0 && visibleCount.value === total.value)
const isIndeterminate = computed(() => visibleCount.value > 0 && visibleCount.value < total.value)

// 首次请求失败自动展开,故障不被折叠入口隐藏;重试成功后保持当前展开状态。
watch(
  () => props.error,
  (error) => {
    if (error) expanded.value = true
  },
  { immediate: true },
)

function toggle(lineId: number) {
  if (props.handle?.lines.find((l) => l.id === lineId)?.renderable === false) return
  const next = !visible.value[lineId]
  visible.value = { ...visible.value, [lineId]: next }
  props.handle?.setLineVisible(lineId, next)
  saveVisibility()
}

// 全选控件:未全部可见 → 全部显示;已全部可见 → 全部隐藏。
function toggleAll() {
  if (!props.handle || total.value === 0) return
  const next = !allVisible.value
  const updates: Record<number, boolean> = {}
  for (const line of sortedLines.value) updates[line.id] = next
  visible.value = { ...visible.value, ...updates }
  for (const line of sortedLines.value) props.handle.setLineVisible(line.id, next)
  saveVisibility()
}
</script>

<template>
  <div class="line-control">
    <button
      type="button"
      class="line-control__toggle"
      :aria-expanded="expanded"
      :aria-label="expanded ? '收起线路清单' : '展开线路清单'"
      @click="expanded = !expanded"
    >
      <span>线路</span>
      <span class="line-control__toggle-count">{{ visibleCount }}/{{ total }}</span>
      <span v-if="issueCount > 0" class="line-control__toggle-issue">异常{{ issueCount }}</span>
    </button>
    <div
      v-if="expanded && (props.handle || props.loading || props.error)"
      class="line-control__panel"
    >
      <div v-if="props.loading" class="line-control__state">线路加载中…</div>
      <div
        v-else-if="props.error"
        class="line-control__state line-control__state--error"
        role="alert"
      >
        <p>{{ props.error }}</p>
        <button
          type="button"
          class="line-control__retry"
          :disabled="props.loading"
          @click="props.onRetry?.()"
        >
          重试
        </button>
      </div>
      <template v-else>
        <div class="line-control__toolbar">
          <label class="line-control__select-all">
            <input
              type="checkbox"
              class="line-control__select-all-input"
              :checked="allVisible"
              :indeterminate.prop="isIndeterminate"
              :disabled="total === 0"
              @click.prevent="toggleAll"
            />
            <span>全选</span>
          </label>
          <span class="line-control__count">{{ visibleCount }}/{{ total }}</span>
        </div>
        <p v-if="total === 0" class="line-control__empty">暂无线线路数据</p>
        <ul v-else class="line-control__list">
          <li v-for="line in sortedLines" :key="line.id">
            <button
              type="button"
              class="line-control__row"
              :class="{ 'is-hidden': !visible[line.id], 'is-disabled': line.renderable === false }"
              :disabled="line.renderable === false"
              :aria-pressed="visible[line.id]"
              @click="toggle(line.id)"
            >
              <span class="line-control__swatch" :style="{ backgroundColor: line.color }" />
              <span class="line-control__name">{{ line.name }}</span>
              <span v-if="line.reason" class="line-control__reason">{{ line.reason }}</span>
              <span v-else-if="line.warning" class="line-control__warning">{{ line.warning }}</span>
            </button>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* 挂在右侧面板列内:按钮位于实时影像框左侧,面板向左展开。 */
.line-control {
  position: absolute;
  z-index: 6;
  right: calc(100% + 12px);
  bottom: 0;
  color: #e9f8ff;
}

.line-control__toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 64px;
  padding: 8px 16px;
  border: 1px solid rgba(105, 180, 255, 0.35);
  border-radius: 4px;
  background: rgba(7, 21, 34, 0.85);
  color: inherit;
  font-size: 14px;
  letter-spacing: 2px;
  cursor: pointer;
}

.line-control__toggle-count {
  font-size: 12px;
  letter-spacing: 0;
  color: rgba(233, 248, 255, 0.7);
}

.line-control__toggle-issue {
  font-size: 12px;
  letter-spacing: 0;
  color: #ffd28f;
}

/* 加载中/失败态内容 */
.line-control__state {
  padding: 14px 12px;
  font-size: 13px;
  text-align: center;
  color: rgba(233, 248, 255, 0.85);
  min-width: 148px;
}

.line-control__state p {
  margin: 0 0 10px;
}

.line-control__state--error {
  color: #ffb4a8;
}

.line-control__retry {
  padding: 4px 18px;
  border: 1px solid rgba(105, 180, 255, 0.5);
  border-radius: 3px;
  background: rgba(64, 140, 255, 0.2);
  color: inherit;
  font-size: 13px;
  cursor: pointer;
}

.line-control__toggle:hover {
  border-color: rgba(105, 180, 255, 0.7);
}

.line-control__panel {
  position: absolute;
  right: calc(100% + 10px);
  bottom: 0;
  max-height: 40vh;
  overflow-y: auto;
  min-width: 148px;
  border: 1px solid rgba(105, 180, 255, 0.35);
  border-radius: 4px;
  background: rgba(7, 21, 34, 0.88);
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.5);
}

.line-control__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px 6px;
  border-bottom: 1px solid rgba(105, 180, 255, 0.25);
  font-size: 13px;
}

.line-control__select-all {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.line-control__count {
  color: rgba(233, 248, 255, 0.7);
}

.line-control__empty {
  margin: 0;
  padding: 12px 10px;
  color: rgba(233, 248, 255, 0.7);
  font-size: 13px;
  text-align: center;
}

.line-control__list {
  margin: 0;
  padding: 6px;
  list-style: none;
}

.line-control__row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.line-control__row:hover {
  background: rgba(64, 140, 255, 0.18);
}

/* 隐藏态整体降亮度 */
.line-control__row.is-hidden {
  opacity: 0.45;
}

/* 不可渲染行:禁用并整体弱化 */
.line-control__row.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 不可渲染原因与坏站点警告:行内小字 */
.line-control__reason,
.line-control__warning {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.2;
}

.line-control__reason {
  color: #ffb4a8;
}

.line-control__warning {
  color: #ffd28f;
}

.line-control__swatch {
  flex: none;
  width: 14px;
  height: 14px;
  border-radius: 2px;
}

.line-control__name {
  line-height: 1;
}
</style>

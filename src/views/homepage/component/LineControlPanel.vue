<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LineRenderHandle } from '@/utils/cesium/lineRenderer'
import { sortLinesNaturally } from '@/utils/lineSort'

const props = defineProps<{ handle: LineRenderHandle | null }>()

const expanded = ref(false)
// 显隐状态:线路 ID → 可见,初始全部可见。
const visible = ref<Record<number, boolean>>({})

watch(
  () => props.handle,
  (handle) => {
    if (!handle) return
    const initial: Record<number, boolean> = {}
    for (const line of handle.lines) initial[line.id] = true
    visible.value = initial
  },
  { immediate: true },
)

const sortedLines = computed(() => sortLinesNaturally(props.handle?.lines ?? []))

function toggle(lineId: number) {
  const next = !visible.value[lineId]
  visible.value[lineId] = next
  props.handle?.setLineVisible(lineId, next)
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
      线路
    </button>
    <div v-if="expanded && props.handle" class="line-control__panel">
      <ul class="line-control__list">
        <li v-for="line in sortedLines" :key="line.id">
          <button
            type="button"
            class="line-control__row"
            :class="{ 'is-hidden': !visible[line.id] }"
            :aria-pressed="visible[line.id]"
            @click="toggle(line.id)"
          >
            <span class="line-control__swatch" :style="{ backgroundColor: line.color }" />
            <span class="line-control__name">{{ line.name }}</span>
          </button>
        </li>
      </ul>
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

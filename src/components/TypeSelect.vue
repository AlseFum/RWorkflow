<script setup>
import { computed } from 'vue'
import { FIELD_TYPES, parseFieldType } from '../schema.js'

const props = defineProps({
  modelValue:     { type: String, required: true },
  /** 锚定元素（按钮），用于计算菜单位置 */
  anchor:         { type: Object, default: null },
  availableEnums: { type: Object, default: null },
  dataBlocks:    { type: Object, default: null },
  fieldTypes:    { type: Array, default: null },
})

const emit = defineEmits(['update:modelValue', 'close'])

// 根据锚点元素计算菜单位置（使用 fixed 定位，相对于视口）
const menuStyle = computed(() => {
  if (!props.anchor) return {}
  const rect = props.anchor.getBoundingClientRect()
  return {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.bottom + 4}px`,
  }
})

const currentType = computed(() => parseFieldType(props.modelValue))

const baseTypes = computed(() =>
  (props.fieldTypes ?? FIELD_TYPES).filter((t) => t.value !== 'enum' && t.value !== 'objectref')
)

const availableTypes = computed(() => {
  if (currentType.value.base === 'enum' || currentType.value.base === 'objectref') {
    return []
  }
  return baseTypes.value
})

const selectType = (newType) => {
  emit('update:modelValue', newType)
  emit('close')
}
</script>

<template>
  <div class="type-menu" :style="menuStyle">
    <div class="type-menu-header">修改类型</div>

    <template v-if="availableTypes.length">
      <button
        v-for="t in availableTypes"
        :key="t.value"
        :class="['type-menu-item', { active: t.value === modelValue } ]"
        @click="selectType(t.value)"
      >
        <span class="type-menu-icon">{{ t.icon }}</span>
        <span class="type-menu-label">{{ t.label }}</span>
        <span v-if="t.value === modelValue" class="type-menu-check">✓</span>
      </button>
    </template>

    <div v-else class="type-menu-empty">
      枚举和引用类型不可改为其他类型
    </div>
  </div>
</template>

<style scoped>
.type-menu {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.5rem;
  min-width: 160px;
  z-index: 100;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.type-menu-header {
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.25rem;
}

.type-menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4rem 0.5rem;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.type-menu-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.type-menu-item.active {
  background: rgba(100, 200, 255, 0.1);
  color: var(--accent);
}

.type-menu-icon {
  font-size: 0.9rem;
}

.type-menu-label {
  flex: 1;
}

.type-menu-check {
  color: var(--success);
  font-weight: bold;
}

.type-menu-empty {
  padding: 0.5rem;
  color: var(--text-muted);
  font-size: 0.8rem;
}
</style>

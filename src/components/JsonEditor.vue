<template>
  <div class="json-editor">
    <div class="tags-container">
      
      <JsonTag
        v-for="fieldDef in visibleFields"
        :key="fieldDef.key"
        :label="fieldDef.label"
        :value="getValue(fieldDef.key)"
        :type="fieldDef.type"
        :options="fieldDef.options"
        :computed="fieldDef.computed"
        @update="(val) => setValue(fieldDef.key, val)"
        @rename="({ oldKey, newKey }) => renameField(oldKey, newKey)"
        @remove="() => removeField(fieldDef.key)"
      />
      <button class="btn-add" @click="addField">+ 添加字段</button>
      <div v-if="visibleFields.length === 0" class="empty-hint">
        {{ schema ? '无可用字段' : '暂无字段' }}
      </div>
    </div>
  </div>
</template>
// TODO 我们需要schema，还需要指向固定data object的属性
<script setup>
// ============================================================
// Props & Emits
// ============================================================
import { ref, computed } from 'vue'
import JsonTag from './JsonTag.vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  schema: { type: Object, default: null },
  messages: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue'])

// ============================================================
// Value Operations
// ============================================================
const getMessage = (key) => props.messages[key] || key
const getValue = (key) => props.modelValue?.[key]
const setValue = (key, value) => {
  const newObj = { ...props.modelValue, [key]: value }
  emit('update:modelValue', newObj)
}

// ============================================================
// Field Rename
// ============================================================
const renameField = (oldKey, newKey) => {
  if (oldKey === newKey || !props.modelValue) return
  const newObj = { ...props.modelValue }
  const val = newObj[oldKey]
  delete newObj[oldKey]
  newObj[newKey] = val
  emit('update:modelValue', newObj)
}

// ============================================================
// Utilities
// ============================================================
const inferType = (value) => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'real'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'string') return 'string'
  if (Array.isArray(value)) return 'vector'
  if (typeof value === 'object') return 'object'
  return 'unknown'
}

const checkDepend = (fieldDef, getVal) => {
  if (!fieldDef.depend) return true
  for (const [depKey, depValue] of Object.entries(fieldDef.depend)) {
    const currentValue = getVal(depKey)
    if (typeof depValue === 'object' && depValue !== null) {
      if (currentValue === depValue.int || currentValue === depValue.real || currentValue === depValue.string) return true
      return false
    }
    if (currentValue !== depValue) return false
  }
  return true
}

// ============================================================
// Computed Fields
// ============================================================
const visibleFields = computed(() => {
  const fields = []
  const schemaKeys = props.schema ? Object.keys(props.schema) : []
  const dataKeys = Object.keys(props.modelValue || {})

  // 先添加 schema 定义的字段
  if (props.schema) {
    for (const [key, def] of Object.entries(props.schema)) {
      const fieldDef = typeof def === 'string' ? { type: def } : def
      if (!checkDepend(fieldDef, getValue)) continue

      let options = fieldDef.options
      if (fieldDef.type === 'enum' && fieldDef.values) {
        options = fieldDef.values.map((v) => typeof v === 'object' ? v : { value: v, label: v })
      }
      fields.push({
        key,
        label: fieldDef.label || getMessage(key),
        type: fieldDef.type,
        options,
        computed: !!fieldDef.computed,
      })
    }
  }

  // 再添加 modelValue 中 schema 没有定义的字段（用户手动添加的）
  for (const key of dataKeys) {
    if (!schemaKeys.includes(key)) {
      fields.push({
        key,
        label: key,
        type: inferType(props.modelValue[key]),
      })
    }
  }

  return fields
})

// ============================================================
// Field Management
// ============================================================
const addField = () => {
  const newKey = 'field_' + Date.now().toString(36)
  const fieldType = 'string' // 默认类型
  setValue(newKey, '')
  emit('addField', { key: newKey, type: fieldType })
}

const removeField = (key) => {
  if (!props.modelValue) return
  const newObj = { ...props.modelValue }
  delete newObj[key]
  emit('update:modelValue', newObj)
}
</script>

<script>
// 非 setup 风格的导出，供外部使用
export default {
  name: 'JsonEditor'
}
</script>

<style scoped>
.json-editor {
  background: var(--bg-secondary);
  border-radius: 8px;
}

.btn-add {
  padding: 0.25rem 0.6rem;
  background: var(--accent);
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover {
  opacity: 0.9;
  transform: scale(1.02);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem;
}

.empty-hint {
  width: 100%;
  padding: 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.8rem;
}
</style>

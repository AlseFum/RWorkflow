<template>
  <div class="json-editor">
    <!-- 添加字段弹窗 -->
    <div v-if="showAddDialog" class="add-dialog-overlay" @click.self="closeAddDialog">
      <div class="add-dialog">
        <h4>添加字段</h4>
        <div class="dialog-field">
          <label>字段名</label>
          <input v-model="newField.key" class="dialog-input" placeholder="字段名" @keyup.enter="confirmAdd" />
        </div>
        <div class="dialog-field">
          <label>类型</label>
          <div class="type-grid">
            <button
              v-for="t in fieldTypes"
              :key="t.value"
              :class="['type-btn', { active: newField.type === t.value }]"
              @click="newField.type = t.value"
            >
              <span class="type-icon">{{ t.icon }}</span>
              <span class="type-label">{{ t.label }}</span>
            </button>
          </div>
        </div>
        <div class="dialog-field" v-if="newField.type === 'enum'">
          <label>选择枚举</label>
          <select v-model="newField.enumRef" class="dialog-select">
            <option value="">-- 自定义 --</option>
            <option v-for="(def, key) in props.enums" :key="key" :value="key">{{ key }}</option>
          </select>
        </div>
        <div class="dialog-field" v-if="newField.type === 'enum' && !newField.enumRef">
          <label>枚举值（逗号分隔）</label>
          <input v-model="newField.enumValues" class="dialog-input" placeholder="a, b, c" />
        </div>
        <div class="dialog-actions">
          <button class="btn-cancel" @click="closeAddDialog">取消</button>
          <button class="btn-confirm" @click="confirmAdd">确认</button>
        </div>
      </div>
    </div>

    <div class="tags-container">
      <JsonTag
        v-for="fieldDef in visibleFields"
        :key="fieldDef.key"
        :label="fieldDef.label"
        :value="getValue(fieldDef.key)"
        :type="fieldDef.type"
        :options="fieldDef.options"
        :available-enums="props.enums"
        @update="(val) => setValue(fieldDef.key, val)"
        @rename="({ oldKey, newKey }) => renameField(oldKey, newKey)"
        @remove="() => removeField(fieldDef.key)"
        @change-type="(newType) => changeFieldType(fieldDef.key, newType)"
      />
      <button class="btn-add" @click="openAddDialog">+ 添加字段</button>
      <div v-if="visibleFields.length === 0" class="empty-hint">
        {{ schema ? '无可用字段' : '暂无字段' }}
      </div>
    </div>
  </div>
</template>

<script setup>
// ============================================================
// Props & Emits
// ============================================================
import { ref, computed } from 'vue'
import JsonTag from './JsonTag.vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  schema: { type: Object, default: null },
  enums: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'addField'])

// ============================================================
// 添加字段弹窗
// ============================================================
const showAddDialog = ref(false)
const newField = ref({ key: '', type: 'string', enumRef: '', enumValues: '' })

const fieldTypes = [
  { value: 'string', label: '字符串', icon: '📝', defaultVal: '' },
  { value: 'int', label: '整数', icon: '🔢', defaultVal: 0 },
  { value: 'real', label: '小数', icon: '📊', defaultVal: 0.0 },
  { value: 'boolean', label: '布尔', icon: '✓', defaultVal: false },
  { value: 'array', label: '数组', icon: '📋', defaultVal: [] },
  { value: 'object', label: '对象', icon: '{}', defaultVal: {} },
  { value: 'enum', label: '枚举', icon: '☰', defaultVal: '' },
]

const openAddDialog = () => {
  newField.value = { key: '', type: 'string', enumRef: '', enumValues: '' }
  showAddDialog.value = true
}

const closeAddDialog = () => {
  showAddDialog.value = false
}

const confirmAdd = () => {
  if (!newField.value.key.trim()) return

  let defaultVal = ''
  let options = null
  let finalType = newField.value.type

  switch (newField.value.type) {
    case 'string': defaultVal = ''; break
    case 'int': defaultVal = 0; break
    case 'real': defaultVal = 0.0; break
    case 'boolean': defaultVal = false; break
    case 'array': defaultVal = []; break
    case 'object': defaultVal = {}; break
    case 'enum':
      if (newField.value.enumRef) {
        // 使用 runtime 中的枚举引用
        finalType = 'enum:' + newField.value.enumRef
        options = getEnumOptions(newField.value.enumRef)
      } else if (newField.value.enumValues) {
        options = newField.value.enumValues.split(',').map(v => ({
          value: v.trim(),
          label: v.trim()
        }))
      }
      break
  }

  setValue(newField.value.key, defaultVal)
  emit('addField', {
    key: newField.value.key,
    type: finalType,
    options
  })
  closeAddDialog()
}

// ============================================================
// 修改字段类型
// ============================================================
const changeFieldType = (key, newType) => {
  const oldValue = getValue(key)
  let newValue = null

  switch (newType) {
    case 'string':
      newValue = oldValue != null ? String(oldValue) : ''
      break
    case 'int':
      newValue = oldValue != null ? parseInt(oldValue, 10) || 0 : 0
      break
    case 'real':
      newValue = oldValue != null ? parseFloat(oldValue) || 0.0 : 0.0
      break
    case 'boolean':
      newValue = oldValue ? true : false
      break
    case 'array':
      newValue = Array.isArray(oldValue) ? [...oldValue] : []
      break
    case 'object':
      newValue = (oldValue != null && typeof oldValue === 'object' && !Array.isArray(oldValue))
        ? { ...oldValue }
        : {}
      break
    case 'enum':
      newValue = typeof oldValue === 'string' ? oldValue : ''
      break
    default:
      newValue = oldValue
  }

  setValue(key, newValue)
  emit('changeFieldType', { key, type: newType })
}

// ============================================================
// Value Operations
// ============================================================
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
  if (Array.isArray(value)) return 'array'
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
// 解析枚举类型定义 "enum:role" -> { baseType: 'enum', ref: 'role' }
const parseEnumType = (typeStr) => {
  if (typeof typeStr !== 'string') return null
  const match = typeStr.match(/^enum:(.+)$/)
  if (match) return { baseType: 'enum', ref: match[1] }
  return null
}

// 获取枚举选项
const getEnumOptions = (enumRef) => {
  if (!props.enums || !enumRef) return null
  const enumDef = props.enums[enumRef]
  if (!enumDef) return null
  // 支持 { warrior: "战士" } 或 [ { value: "warrior", label: "战士" } ]
  if (Array.isArray(enumDef)) return enumDef
  return Object.entries(enumDef).map(([value, label]) => ({ value, label }))
}

const visibleFields = computed(() => {
  const fields = []
  const schemaKeys = props.schema ? Object.keys(props.schema) : []
  const dataKeys = Object.keys(props.modelValue || {})

  // 先添加 schema 定义的字段
  if (props.schema) {
    for (const [key, def] of Object.entries(props.schema)) {
      const fieldDef = typeof def === 'string' ? { type: def } : { ...def }
      if (!checkDepend(fieldDef, getValue)) continue

      let options = fieldDef.options
      let type = fieldDef.type

      // 处理 enum:role 语法
      const enumRef = parseEnumType(type)
      if (enumRef) {
        type = 'enum'
        options = getEnumOptions(enumRef.ref)
      } else if (type === 'enum' && fieldDef.values) {
        options = fieldDef.values.map((v) => typeof v === 'object' ? v : { value: v, label: v })
      }

      fields.push({
        key,
        label: fieldDef.label || key,
        type,
        options,
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

/* 添加字段弹窗 */
.add-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.add-dialog {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  min-width: 360px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.add-dialog h4 {
  margin: 0 0 1rem;
  color: var(--text-primary);
  font-size: 1rem;
}

.dialog-field {
  margin-bottom: 1rem;
}

.dialog-field label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.dialog-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.9rem;
  box-sizing: border-box;
}

.dialog-input:focus {
  outline: none;
  border-color: var(--accent);
}

.dialog-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.9rem;
  box-sizing: border-box;
  cursor: pointer;
}

.dialog-select:focus {
  outline: none;
  border-color: var(--accent);
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.6rem 0.4rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn:hover {
  border-color: var(--accent);
  background: rgba(255, 255, 255, 0.05);
}

.type-btn.active {
  border-color: var(--accent);
  background: rgba(100, 200, 255, 0.1);
  box-shadow: 0 0 0 2px rgba(100, 200, 255, 0.2);
}

.type-icon {
  font-size: 1.2rem;
}

.type-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.type-btn.active .type-label {
  color: var(--accent);
}

.dialog-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.25rem;
}

.btn-cancel,
.btn-confirm {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.05);
}

.btn-confirm {
  background: var(--accent);
  color: white;
}

.btn-confirm:hover {
  opacity: 0.9;
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

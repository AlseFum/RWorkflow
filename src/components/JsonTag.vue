<template>
  <div
    ref="tagRef"
    :class="['json-tag', 'tag-' + type, { editing: isEditing || isEditingKey }]"
  >
    <!-- 类型选择器（编辑时显示） -->
    <template v-if="isEditing">
      <div class="type-selector">
        <select v-model="localType" class="type-select" @change="onTypeChange">
          <option v-for="t in availableTypes" :key="t.value" :value="t.value">
            {{ t.icon }} {{ t.label }}
          </option>
        </select>
      </div>
    </template>

    <template v-if="isEditingKey">
      <input
        v-model="localKey"
        class="tag-key-input"
        @keyup.enter.stop="saveKeyEdit"
        @keyup.escape.stop="cancelKeyEdit"
        @click.stop
      />
      <button class="tag-btn save" @click.stop="saveKeyEdit">✓</button>
      <button class="tag-btn cancel" @click.stop="cancelKeyEdit">✕</button>
    </template>
    <template v-else>
      <span class="tag-label" @dblclick.stop="startKeyEdit">{{ label }}</span>
      <span class="tag-sep">=</span>

      <template v-if="isEditing">
        <div class="tag-edit-form">
          <template v-if="hasEnumOptions">
            <select v-model="localValue" class="tag-select">
              <option v-for="opt in options" :key="opt.value" :value="opt.value">
                {{ opt.label || opt.value }}
              </option>
            </select>
          </template>
          <template v-else-if="localType === 'int' || localType === 'real'">
            <input
              v-model="localValue"
              type="number"
              :step="localType === 'int' ? 1 : 'any'"
              class="tag-input"
              @keyup.enter.stop="$emit('update', parseValue(localValue))"
              @keyup.escape.stop="cancelEdit"
            />
          </template>
          <template v-else-if="localType === 'array'">
            <div class="tag-vector">
              <span class="vector-bracket">[</span>
              <span class="vector-items">{{ (localValue || []).length }} items</span>
              <span class="vector-bracket">]</span>
            </div>
          </template>
          <template v-else>
            <input
              v-model="localValue"
              class="tag-input"
              :placeholder="label"
              @keyup.enter.stop="$emit('update', localValue)"
              @keyup.escape.stop="cancelEdit"
            />
          </template>

          <div class="tag-actions">
            <button class="tag-btn save" @click.stop="saveEdit">✓</button>
            <button class="tag-btn cancel" @click.stop="cancelEdit">✕</button>
          </div>
        </div>
      </template>
      <template v-else>
        <template v-if="type === 'boolean'">
          <span :class="['tag-value', 'tag-bool', value ? 'bool-on' : 'bool-off']">
            {{ value ? 'true' : 'false' }}
          </span>
        </template>
        <template v-else-if="type === 'int' || type === 'real'">
          <span class="tag-value tag-number">{{ formatNumber(value) }}</span>
        </template>
        <template v-else-if="type === 'array'">
          <span class="tag-value tag-vector-val">[{{ (value || []).length }}]</span>
        </template>
        <template v-else-if="type === 'object'">
          <span class="tag-value tag-object">{...}</span>
        </template>
        <template v-else-if="type === 'objectref'">
          <span class="tag-value tag-ref">@{{ value || 'null' }}</span>
        </template>
        <template v-else-if="hasEnumOptionsDisplay">
          <span class="tag-value tag-enum">{{ getEnumLabel(value) }}</span>
        </template>
        <template v-else>
          <span class="tag-value tag-string">{{ formatString(value) }}</span>
        </template>

        <span class="tag-actions">
          <button class="tag-btn type" @click.stop="openTypeMenu" title="修改类型">⚙</button>
          <button class="tag-btn edit" @click.stop="startEdit" title="编辑">✎</button>
          <button class="tag-btn delete" @click.stop="$emit('remove')" title="删除">✕</button>
        </span>
      </template>
    </template>

    <!-- 类型选择下拉菜单 -->
    <div v-if="showTypeMenu" ref="typeMenuRef" class="type-menu">
      <div class="type-menu-header">修改类型</div>
      <template v-for="t in availableTypes" :key="t.value">
        <button
          :class="['type-menu-item', { active: t.value === type || (t.value === 'enum' && hasEnumOptionsDisplay) }]"
          @click.stop="t.value === 'enum' ? null : selectType(t.value)"
        >
          <span class="type-menu-icon">{{ t.icon }}</span>
          <span class="type-menu-label">{{ t.label }}</span>
          <span v-if="t.value === type && !hasEnumOptionsDisplay" class="type-menu-check">✓</span>
        </button>
        <!-- 枚举子选项 -->
        <template v-if="t.value === 'enum' && props.availableEnums">
          <button
            v-for="(def, enumKey) in props.availableEnums"
            :key="enumKey"
            :class="['type-menu-item', 'type-menu-sub', { active: enumRef === enumKey }]"
            @click.stop="selectType('enum:' + enumKey)"
          >
            <span class="type-menu-icon">☰</span>
            <span class="type-menu-label">{{ enumKey }}</span>
            <span v-if="enumRef === enumKey" class="type-menu-check">✓</span>
          </button>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { default: null },
  type: { type: String, default: 'string' },
  options: { type: Array, default: () => [] },
  availableEnums: { type: Object, default: null },
})

const emit = defineEmits(['update', 'remove', 'rename', 'change-type'])

// 解析枚举类型引用（如 "enum:role" -> "role"）
const enumRef = computed(() => {
  if (typeof props.type !== 'string') return null
  const match = props.type.match(/^enum:(.+)$/)
  return match ? match[1] : null
})

// 获取类型的显示标签
const typeLabel = computed(() => {
  const ref = enumRef.value
  if (ref) return '枚举:' + ref
  return availableTypes.find(t => t.value === props.type)?.label || props.type
})

// 编辑时的枚举引用
const localEnumRef = computed(() => {
  if (typeof localType.value !== 'string') return null
  const match = localType.value.match(/^enum:(.+)$/)
  return match ? match[1] : null
})

// 是否有枚举选项（用于编辑）
const hasEnumOptions = computed(() => {
  return localEnumRef.value || (localType.value === 'enum' && props.options?.length > 0)
})

// 是否有枚举选项（用于显示）
const hasEnumOptionsDisplay = computed(() => {
  return enumRef.value || (props.type === 'enum' && props.options?.length > 0)
})

// ============================================================
// 类型配置
// ============================================================
const availableTypes = [
  { value: 'string', label: '字符串', icon: '📝' },
  { value: 'int', label: '整数', icon: '🔢' },
  { value: 'real', label: '小数', icon: '📊' },
  { value: 'boolean', label: '布尔', icon: '✓' },
  { value: 'array', label: '数组', icon: '📋' },
  { value: 'object', label: '对象', icon: '{}' },
  { value: 'enum', label: '枚举', icon: '☰' },
]

// ============================================================
// 状态
// ============================================================
const isEditing = ref(false)
const isEditingKey = ref(false)
const localValue = ref(null)
const localKey = ref('')
const localType = ref(props.type)
const showTypeMenu = ref(false)
const tagRef = ref(null)
const typeMenuRef = ref(null)

// ============================================================
// 外部点击处理
// ============================================================
const handleClickOutside = (e) => {
  if (isEditing.value && tagRef.value && !tagRef.value.contains(e.target)) {
    cancelEdit()
  }
  if (isEditingKey.value && tagRef.value && !tagRef.value.contains(e.target)) {
    cancelKeyEdit()
  }
  if (showTypeMenu.value && typeMenuRef.value && !typeMenuRef.value.contains(e.target)) {
    showTypeMenu.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

// ============================================================
// 类型切换
// ============================================================
const onTypeChange = () => {
  // 切换类型时转换值
  const newVal = convertValue(props.value, localType.value)
  localValue.value = newVal
}

const convertValue = (val, toType) => {
  switch (toType) {
    case 'string':
      return val != null ? String(val) : ''
    case 'int':
      return val != null ? (parseInt(val, 10) || 0) : 0
    case 'real':
      return val != null ? (parseFloat(val) || 0.0) : 0.0
    case 'boolean':
      return val ? true : false
    case 'array':
      return Array.isArray(val) ? [...val] : []
    case 'object':
      return (val != null && typeof val === 'object' && !Array.isArray(val)) ? { ...val } : {}
    case 'enum':
    default:
      // enum:xxx 类型也返回字符串
      if (toType?.startsWith?.('enum:')) return typeof val === 'string' ? val : ''
      return val
  }
}

const openTypeMenu = () => {
  showTypeMenu.value = !showTypeMenu.value
}

const selectType = (newType) => {
  if (newType === 'enum' && enumRef.value) {
    // 切换到枚举但保持当前枚举引用
    return
  }
  if (newType !== props.type) {
    emit('change-type', newType)
  }
  showTypeMenu.value = false
}

// ============================================================
// 值格式化
// ============================================================
const formatString = (val) => {
  if (val === null || val === undefined) return 'null'
  return val
}

const formatNumber = (val) => {
  if (val === null || val === undefined) return 'null'
  return String(val)
}

const parseValue = (val) => {
  if (localType.value === 'int') return val !== '' ? parseInt(val, 10) : null
  if (localType.value === 'real') return val !== '' ? parseFloat(val) : null
  if (localType.value === 'array') return val || []
  if (localType.value === 'boolean') return Boolean(val)
  return val
}

const getEnumLabel = (value) => {
  if (!props.options?.length) return value
  const opt = props.options.find((o) => o.value === value)
  return opt ? (opt.label || opt.value) : value
}

// ============================================================
// 编辑操作
// ============================================================
const startEdit = () => {
  localType.value = props.type
  if (props.type === 'array') {
    localValue.value = [...(props.value || [])]
  } else if (props.type === 'int' || props.type === 'real') {
    localValue.value = props.value !== null && props.value !== undefined ? Number(props.value) : ''
  } else if (props.type === 'boolean') {
    localValue.value = props.value ?? false
  } else {
    localValue.value = props.value ?? ''
  }
  isEditing.value = true
}

const saveEdit = () => {
  const parsedValue = parseValue(localValue.value)
  emit('update', parsedValue)
  // 如果类型改变了
  if (localType.value !== props.type) {
    emit('change-type', localType.value)
  }
  isEditing.value = false
}

const cancelEdit = () => {
  isEditing.value = false
  localValue.value = null
  localType.value = props.type
}

const startKeyEdit = () => {
  localKey.value = props.label
  isEditingKey.value = true
}

const saveKeyEdit = () => {
  if (localKey.value && localKey.value !== props.label) {
    emit('rename', { oldKey: props.label, newKey: localKey.value })
  }
  cancelKeyEdit()
}

const cancelKeyEdit = () => {
  isEditingKey.value = false
  localKey.value = ''
}

watch(() => props.value, () => {
  if (!isEditing.value) {
    isEditing.value = false
  }
})

watch(() => props.type, (newType) => {
  localType.value = newType
})
</script>

<style scoped>
.json-tag {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.json-tag:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.08);
}

.json-tag.editing {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border-color: var(--accent);
  padding: 0.5rem;
  flex-wrap: wrap;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}

.json-tag.tag-computed {
  opacity: 0.7;
  cursor: default;
}

.json-tag.tag-computed:hover {
  border-color: var(--border);
  box-shadow: none;
}

.tag-label {
  color: var(--accent);
  font-weight: 500;
}

.tag-sep {
  color: var(--text-muted);
}

.tag-value {
  color: var(--text-primary);
}

.tag-string {
  color: var(--success);
}

.tag-string::before,
.tag-string::after {
  content: '"';
  color: var(--text-muted);
}

.tag-number {
  color: #e06c75;
  font-family: monospace;
}

.tag-bool {
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
}

.bool-on {
  background: rgba(85, 201, 135, 0.2);
  color: var(--success);
}

.bool-off {
  background: rgba(206, 89, 89, 0.2);
  color: var(--error);
}

.tag-vector-val {
  color: var(--warning);
  font-family: monospace;
}

.tag-enum {
  color: #c678dd;
  font-weight: 500;
}

.tag-object {
  color: var(--text-muted);
  font-family: monospace;
  font-style: italic;
}

.tag-ref {
  color: var(--accent);
  font-family: monospace;
  font-weight: 500;
}

.tag-ref::before {
  content: '';
}

/* 类型选择器 */
.type-selector {
  margin-right: 0.5rem;
}

.type-select {
  padding: 0.2rem 0.4rem;
  background: var(--bg-primary);
  border: 1px solid var(--accent);
  border-radius: 4px;
  color: var(--accent);
  font-size: 0.75rem;
  cursor: pointer;
}

.type-select:focus {
  outline: none;
}

/* 类型菜单 */
.type-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.5rem;
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

/* 编辑表单 */
.tag-edit-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag-input {
  padding: 0.25rem 0.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.8rem;
  min-width: 80px;
}

.tag-input:focus {
  outline: none;
  border-color: var(--accent);
}

.tag-key-input {
  padding: 0.25rem 0.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--accent);
  border-radius: 4px;
  color: var(--accent);
  font-family: inherit;
  font-size: 0.8rem;
  min-width: 80px;
  font-weight: 600;
}

.tag-key-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(100, 200, 255, 0.2);
}

.tag-select {
  padding: 0.25rem 0.4rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.8rem;
}

.tag-vector {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--warning);
  font-family: monospace;
  font-size: 0.8rem;
}

.vector-bracket {
  color: var(--text-muted);
}

.tag-actions {
  display: flex;
  gap: 0.25rem;
  margin-left: auto;
}

.tag-btn {
  padding: 0.2rem 0.35rem;
  border: none;
  border-radius: 3px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s;
}

.tag-btn.save {
  background: var(--success);
  color: white;
}

.tag-btn.cancel {
  background: var(--error);
  color: white;
}

.tag-btn.delete {
  background: transparent;
  color: var(--error);
  opacity: 0.6;
}

.tag-btn.edit {
  background: transparent;
  color: var(--accent);
  opacity: 0.7;
}

.tag-btn.type {
  background: transparent;
  color: var(--text-muted);
  opacity: 0.7;
}

.tag-btn:hover {
  opacity: 1;
}

.tag-btn.type:hover,
.tag-btn.edit:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}
</style>

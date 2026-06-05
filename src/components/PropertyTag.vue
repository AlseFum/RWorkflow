<script setup>
/**
 * PropertyTag — 单个 schema 字段的标签编辑
 * 支持：string / int / real / boolean / enum:xxx / objectref:xxx / computed / readOnly
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Tooltip from './Tooltip.vue'
import {
  parseFieldType,
  enumLabelFor,
  objectRefLabel,
  FIELD_TYPES,
} from '../schema.js'

const props = defineProps({
  fieldKey:   { type: String, required: true }, // 字段真实 key，用于重命名时定位原字段
  label:      { type: String, required: true }, // 字段展示名，显示在 tag 左侧
  value:      { default: null }, // 字段当前值，用于显示与编辑
  type:       { type: String, default: 'string' }, // 基础类型，控制输入方式与样式
  schemaType: { type: String, default: '' }, // 完整类型定义，保留 enum:xxx / objectref:xxx 引用目标
  options:    { type: Array, default: () => [] }, // 可选项列表，供 enum / 下拉选择显示与编辑
  dataBlocks: { type: Object, default: null }, // objectref 关联的数据块，用于显示引用文本和 tooltip
  readOnly:   { type: Boolean, default: false }, // 只读字段，禁止编辑值 / 改名 / 改类型 / 删除
  computed:   { type: Boolean, default: false }, // 计算字段，视为不可直接编辑
})

const emit = defineEmits([
  'update', // 提交字段值更新
  'remove', // 删除当前字段
  'rename', // 重命名字段 key
  'change-type', // 打开或触发类型修改
])

const isEditing     = ref(false) // 当前是否处于字段值编辑模式
const isEditingKey  = ref(false) // 当前是否处于字段名编辑模式
const localValue    = ref(null) // 编辑中的临时字段值
const localKey      = ref('') // 编辑中的临时字段 key
const tagRef        = ref(null) // 当前 tag 根节点，用于点击外部时判断
const tipAnchor     = ref(null) // tooltip 锚点元素
const showTooltip   = ref(false) // 是否显示 objectref tooltip

const parsedType    = computed(() => parseFieldType(props.schemaType || props.type)) // 解析完整类型定义，提取基础类型和引用目标
const isEnum        = computed(() => props.type === 'enum') // 当前字段是否为枚举类型
const isObjectRef   = computed(() => props.type === 'objectref') // 当前字段是否为对象引用类型
const hasOptions    = computed(() => props.options?.length > 0) // 当前字段是否存在可选项
const canEdit       = computed(() => !props.readOnly && !props.computed) // 当前字段是否允许编辑

const typeLabel = computed(() => {
  if (parsedType.value.base === 'enum')      return `枚举:${parsedType.value.ref}`
  if (parsedType.value.base === 'objectref') return `引用:${parsedType.value.ref}`
  return FIELD_TYPES.find((t) => t.value === props.type)?.label || props.type
}) // 当前字段类型的人类可读标签

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined) return 'null'
  if (isObjectRef.value) {
    return objectRefLabel(props.dataBlocks, props.schemaType, props.value)
  }
  if (isEnum.value && hasOptions.value) {
    return enumLabelFor(props.options, props.value)
  }
  if (props.type === 'boolean') return props.value ? 'true' : 'false'
  if (props.type === 'int' || props.type === 'real') return String(props.value)
  return String(props.value)
}) // 当前字段值的展示文本

const objectRefTooltip = computed(() => {
  if (!isObjectRef.value) return ''
  const { ref } = parsedType.value
  if (!ref || !props.dataBlocks?.[ref]) return ''
  const stored = String(props.value ?? '')
  const key = stored.startsWith(ref + '.') ? stored.slice(ref.length + 1) : stored
  const obj = props.dataBlocks[ref][key]
  if (!obj || typeof obj !== 'object') return ''

  const meta = ['title', 'desc', 'icon']
  const lines = []

  if (obj.title) lines.push(obj.title)
  if (obj.desc)  lines.push(obj.desc)
  if (obj.icon)  lines.push(obj.icon + ' ' + (obj.title || ''))

  const props_ = Object.entries(obj)
    .filter(([k]) => !meta.includes(k))
  if (props_.length) {
    if (lines.length) lines.push('')
    for (const [k, v] of props_) {
      lines.push(`${k}: ${typeof v === 'number' ? v : JSON.stringify(v)}`)
    }
  }

  return lines.join('\n')
}) // objectref 字段悬浮时展示的引用对象详情文本

// ============================================================
// 值编辑
// ============================================================
const startEdit = () => {
  if (!canEdit.value) return
  if (props.type === 'int' || props.type === 'real') {
    localValue.value = props.value != null ? Number(props.value) : ''
  } else if (props.type === 'boolean') {
    localValue.value = props.value ?? false
  } else {
    localValue.value = props.value ?? ''
  }
  isEditing.value = true
} // 进入字段值编辑模式，并初始化临时值

const saveEdit = () => {
  let val = localValue.value
  if (props.type === 'int')  val = val !== '' ? parseInt(val, 10) : 0
  if (props.type === 'real') val = val !== '' ? parseFloat(val) : 0
  if (props.type === 'boolean') val = Boolean(val)
  emit('update', val)
  isEditing.value = false
  localValue.value = null
} // 保存字段值编辑结果，并按类型转换后抛出 update

const cancelEdit = () => { isEditing.value = false; localValue.value = null } // 取消字段值编辑并清空临时值

// ============================================================
// 键名编辑
// ============================================================
const startKeyEdit = () => {
  if (!canEdit.value) return
  localKey.value = props.fieldKey
  isEditingKey.value = true
} // 进入字段名编辑模式，并载入当前 key
const saveKeyEdit = () => {
  if (localKey.value.trim() && localKey.value !== props.fieldKey) {
    emit('rename', { oldKey: props.fieldKey, newKey: localKey.value.trim() })
    cancelKeyEdit()
  } else {
    cancelKeyEdit()
  }
} // 保存字段名修改，若有变化则抛出 rename
const cancelKeyEdit = () => { isEditingKey.value = false; localKey.value = '' } // 取消字段名编辑并清空临时 key

// ============================================================
// 外部点击处理（仅关闭编辑框）
// ============================================================
const handleDocClick = (e) => {
  if (isEditing.value    && tagRef.value && !tagRef.value.contains(e.target)) saveEdit()
  if (isEditingKey.value && tagRef.value && !tagRef.value.contains(e.target)) saveKeyEdit()
} // 点击组件外部时自动提交当前编辑
onMounted(() => document.addEventListener('click', handleDocClick)) // 挂载后监听文档点击
onUnmounted(() => document.removeEventListener('click', handleDocClick)) // 卸载时移除文档点击监听
</script>

<template>
  <div
    ref="tagRef"
    :class="[
      'property-tag',
      'tag-' + (isObjectRef ? 'ref' : type),
      { editing: isEditing || isEditingKey, 'tag-computed': computed, 'tag-readonly': readOnly },
    ]"
  >
    <!-- 键名编辑模式 -->
    <template v-if="isEditingKey">
      <input v-model="localKey" class="tag-key-input"
        @keyup.enter.stop="saveKeyEdit"
        @keyup.escape.stop="cancelKeyEdit"
        @click.stop />
      <span class="tag-sep">=</span>
      <span class="tag-value tag-display-only">{{ displayValue }}</span>
      <button class="tag-btn save"  @click.stop="saveKeyEdit">✓</button>
      <button class="tag-btn cancel" @click.stop="cancelKeyEdit">✕</button>
    </template>

    <!-- 正常模式 -->
    <template v-else>
      <span class="tag-label" :title="fieldKey" @dblclick.stop="startKeyEdit">{{ label }}</span>
      <span class="tag-sep">=</span>

      <!-- 值编辑模式 -->
      <template v-if="isEditing">
        <div class="tag-edit-form">
          <select v-if="hasOptions" v-model="localValue" class="tag-select">
            <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <input v-else-if="type === 'int' || type === 'real'" v-model="localValue"
            type="number" :step="type === 'int' ? 1 : 'any'" class="tag-input"
            @keyup.enter.stop="saveEdit" @keyup.escape.stop="cancelEdit" />
          <select v-else-if="type === 'boolean'" v-model="localValue" class="tag-select">
            <option :value="true">true</option>
            <option :value="false">false</option>
          </select>
          <input v-else v-model="localValue" class="tag-input"
            @keyup.enter.stop="saveEdit" @keyup.escape.stop="cancelEdit" />
          <button class="tag-btn save"  @click.stop="saveEdit">✓</button>
          <button class="tag-btn cancel" @click.stop="cancelEdit">✕</button>
        </div>
      </template>

      <!-- 值显示模式 -->
      <template v-else>
        <span
          ref="tipAnchor"
          class="tag-value"
          :class="{
            'tag-bool':    type === 'boolean' && value,
            'bool-on':     type === 'boolean' && value,
            'bool-off':    type === 'boolean' && !value,
            'tag-number':  type === 'int' || type === 'real',
            'tag-enum':    isEnum,
            'tag-ref':     isObjectRef,
            'tag-string':  !isEnum && !isObjectRef && type !== 'boolean' && type !== 'int' && type !== 'real',
          }"
          @mouseenter="isObjectRef && objectRefTooltip && (showTooltip = true)"
          @mouseleave="showTooltip = false"
        >{{ displayValue }}</span>
        <Tooltip :show="showTooltip" :anchor="tipAnchor">{{ objectRefTooltip }}</Tooltip>
        <span v-if="canEdit" class="tag-actions">
          <button class="tag-btn type" :title="typeLabel" @click.stop="$emit('change-type', $el)">⚙</button>
          <button class="tag-btn delete" title="删除" @click.stop="$emit('remove')">✕</button>
          <button class="tag-btn edit"  title="编辑" @click.stop="startEdit">✎</button>
          
        </span>
      </template>
    </template>
  </div>
</template>

<style scoped>
.property-tag {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  font-size: 0.8rem;
  transition: border-color 0.15s;
}
.property-tag:hover:not(.tag-readonly):not(.tag-computed) {
  border-color: var(--accent);
}
.property-tag.editing { border-color: var(--accent); }
.property-tag.tag-computed,
.property-tag.tag-readonly { opacity: 0.75; }
.tag-label { color: var(--accent); font-weight: 500; cursor: default; }
.tag-sep   { color: var(--text-muted); }
.tag-value.tag-string  { color: var(--success); }
.tag-value.tag-number  { color: #e06c75; font-family: monospace; }
.tag-value.tag-enum    { color: #c678dd; font-weight: 500; }
.tag-value.tag-ref     { color: var(--accent); font-family: monospace; font-weight: 500; cursor: help; }

.tag-bool.bool-on  { color: var(--success); }
.tag-bool.bool-off  { color: var(--error); }
.tag-value.tag-display-only { opacity: 0.6; cursor: default; font-style: italic; }
.tag-edit-form { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
.tag-input, .tag-select, .tag-key-input {
  padding: 0.25rem 0.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.8rem;
}
.tag-key-input { border-color: var(--accent); min-width: 72px; }
.tag-actions { display: flex; gap: 0.2rem; }
.tag-btn {
  padding: 0.15rem 0.35rem;
  border: none; border-radius: 3px;
  font-size: 0.7rem; cursor: pointer;
}
.tag-btn.save     { background: var(--success); color: #fff; }
.tag-btn.cancel,
.tag-btn.delete   { background: transparent; color: var(--accent); opacity: 0.8; }
.tag-btn.edit,
.tag-btn.type     { background: transparent; color: var(--accent); opacity: 0.8; }
</style>

<script setup>
/**
 * PropertyEditor — 基于 schema 的属性标签编辑器
 * 支持：字段展示 / 值更新 / 改名 / 删除 / 添加字段 / 类型切换
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PropertyTag from './PropertyTag.vue'
import TypeSelect from './TypeSelect.vue'
import {
  FIELD_TYPES,
  buildVisibleFields,
  convertValue,
  defaultValueForType,
} from '../schema.js'

const props = defineProps({
  modelValue: { type: Object, required: true }, // 当前编辑对象，字段值来源与提交目标
  schema:     { type: Object, default: null }, // 字段 schema 定义，用于构造可见字段列表
  enums:      { type: Object, default: null }, // 枚举定义集合，供 enum 字段展示与新增时选择
  dataBlocks: { type: Object, default: null }, // 数据块集合，供 objectref 字段展示与新增时选择
  allowAdd:   { type: Boolean, default: true }, // 是否允许添加新字段
})

const emit = defineEmits([
  'update:modelValue', // 提交整个对象的更新结果
  'addField', // 通知外层新增了一个字段定义
  'changeFieldType', // 通知外层某字段类型发生变化
])

const fieldTypes = FIELD_TYPES // 可选字段类型列表，供新增字段与类型切换菜单使用

const showAddDialog  = ref(false) // 当前是否显示添加字段弹窗
const newField       = ref({ key: '', type: 'string', ref: '' }) // 添加字段时的临时表单数据
const editorRef      = ref(null) // 编辑器根节点，用于判断外部点击

const showTypeMenu   = ref(false) // 当前是否显示类型切换菜单
const typeMenuTarget = ref(null) // 当前准备切换类型的字段 key
const typeMenuAnchor = ref(null) // 类型菜单锚点元素，用于计算弹出位置
let typeMenuIgnoreUntil = 0 // 忽略此次时间戳之前的 document 点击，避免按钮点击后立刻关闭菜单

const visibleFields = computed(() =>
  buildVisibleFields(
    props.schema,
    props.modelValue,
    props.enums,
    props.dataBlocks,
  )
) // 根据 schema、当前值与辅助定义计算出最终可编辑字段列表

const typeMenuSchemaType = computed(() => {
  if (!typeMenuTarget.value) return 'string'
  const f = visibleFields.value.find((x) => x.key === typeMenuTarget.value)
  return f?.schemaType || f?.type || 'string'
}) // 当前类型菜单对应字段的完整 schemaType

const getValue = (key) => props.modelValue?.[key] // 读取指定字段当前值
const setValue = (key, value) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
} // 以不可变方式更新单个字段值并整体抛出 modelValue

// ============================================================
// 类型菜单
// ============================================================
const openTypeMenu = (key, anchorEl) => {
  typeMenuTarget.value = key
  typeMenuAnchor.value = anchorEl
  showTypeMenu.value = true
  typeMenuIgnoreUntil = Date.now() + 100
} // 打开字段类型切换菜单，并记录目标字段和锚点

const closeTypeMenu = () => {
  showTypeMenu.value = false
  typeMenuTarget.value = null
  typeMenuAnchor.value = null
} // 关闭字段类型切换菜单，并清空目标状态

const onTypeMenuSelect = (newSchemaType) => {
  if (!typeMenuTarget.value) return
  const key = typeMenuTarget.value
  setValue(key, convertValue(getValue(key), newSchemaType))
  emit('changeFieldType', { key, type: newSchemaType })
  closeTypeMenu()
} // 切换字段类型，先转换当前值，再通知外层更新 schema

const handleDocClick = (e) => {
  if (!showTypeMenu.value) return
  if (Date.now() < typeMenuIgnoreUntil) return
  if (editorRef.value && editorRef.value.contains(e.target)) return
  closeTypeMenu()
} // 点击编辑器外部时关闭类型菜单

onMounted(() => document.addEventListener('click', handleDocClick)) // 挂载后监听文档点击以支持外部关闭菜单
onUnmounted(() => document.removeEventListener('click', handleDocClick)) // 卸载时清理文档点击监听

// ============================================================
// 添加字段
// ============================================================
const openAddDialog = () => {
  newField.value = { key: '', type: 'string', ref: '' }
  showAddDialog.value = true
} // 打开添加字段弹窗，并重置临时表单

const closeAddDialog = () => { showAddDialog.value = false } // 关闭添加字段弹窗

const confirmAdd = () => {
  const k = newField.value.key.trim()
  if (!k) return

  let schemaType = newField.value.type
  if (newField.value.type === 'enum' && newField.value.ref) {
    schemaType = `enum:${newField.value.ref}`
  }
  if (newField.value.type === 'objectref' && newField.value.ref) {
    schemaType = `objectref:${newField.value.ref}`
  }

  setValue(k, defaultValueForType(schemaType))
  emit('addField', { key: k, type: schemaType })
  closeAddDialog()
} // 确认添加字段，生成完整 schemaType、写入默认值并通知外层扩展 schema

// ============================================================
// 字段重命名 / 删除
// ============================================================
const renameField = (oldKey, newKey) => {
  if (oldKey === newKey || !props.modelValue) return
  const next = { ...props.modelValue }
  next[newKey] = next[oldKey]
  delete next[oldKey]
  emit('update:modelValue', next)
} // 重命名字段 key，并保留其原有字段值

const removeField = (key) => {
  const next = { ...props.modelValue }
  delete next[key]
  emit('update:modelValue', next)
} // 删除指定字段，并整体抛出新的 modelValue
</script>

<template>
  <div ref="editorRef" class="property-editor">
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
              @click="newField.type = t.value; newField.ref = ''"
            >
              <span class="type-icon">{{ t.icon }}</span>
              <span class="type-label">{{ t.label }}</span>
            </button>
          </div>
        </div>
        <div v-if="newField.type === 'enum'" class="dialog-field">
          <label>枚举定义</label>
          <select v-model="newField.ref" class="dialog-select">
            <option value="">-- 无 --</option>
            <option v-for="(_, key) in enums" :key="key" :value="key">{{ key }}</option>
          </select>
        </div>
        <div v-if="newField.type === 'objectref'" class="dialog-field">
          <label>引用数据块</label>
          <select v-model="newField.ref" class="dialog-select">
            <option value="">-- 无 --</option>
            <option v-for="(_, key) in dataBlocks" :key="key" :value="key">{{ key }}</option>
          </select>
        </div>
        <div class="dialog-actions">
          <button class="btn-cancel" @click="closeAddDialog">取消</button>
          <button class="btn-confirm" @click="confirmAdd">确认</button>
        </div>
      </div>
    </div>

    <div class="tags-container">
      <PropertyTag
        v-for="f in visibleFields"
        :key="f.key"
        :ref="el => { if (f.key === typeMenuTarget) typeMenuAnchor = el?.$el }"
        :field-key="f.key"
        :label="f.label"
        :value="modelValue[f.key]"
        :type="f.type"
        :schema-type="f.schemaType"
        :options="f.options"
        :data-blocks="dataBlocks"
        :read-only="f.readOnly"
        :computed="f.computed"
        @update="(val) => setValue(f.key, val)"
        @rename="({ oldKey, newKey }) => renameField(oldKey, newKey)"
        @remove="() => removeField(f.key)"
        @change-type="(anchorEl) => openTypeMenu(f.key, anchorEl)"
      />
      <button v-if="allowAdd" class="btn-add" @click="openAddDialog">+ 添加字段</button>
      <div v-if="visibleFields.length === 0" class="empty-hint">
        {{ schema ? '无可见字段（检查 depend）' : '暂无字段' }}
      </div>

      <TypeSelect
        v-if="showTypeMenu && typeMenuAnchor"
        :model-value="typeMenuSchemaType"
        :anchor="typeMenuAnchor"
        :available-enums="enums"
        :data-blocks="dataBlocks"
        :field-types="fieldTypes"
        @update:model-value="onTypeMenuSelect"
        @close="closeTypeMenu"
      />
    </div>
  </div>
</template>

<script>
export default { name: 'PropertyEditor' }
</script>

<style scoped>
.property-editor { background: var(--bg-secondary); border-radius: 8px; }
.tags-container { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0.75rem; }
.empty-hint { width: 100%; padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.8rem; }
.btn-add {
  padding: 0.25rem 0.6rem;
  background: var(--accent);
  border: none; border-radius: 4px;
  color: white; font-size: 0.7rem; cursor: pointer;
}
.add-dialog-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.add-dialog {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px; padding: 1.5rem; min-width: 320px;
}
.add-dialog h4 { margin: 0 0 1rem; }
.dialog-field { margin-bottom: 1rem; }
.dialog-field label { display: block; margin-bottom: 0.4rem; font-size: 0.85rem; color: var(--text-secondary); }
.dialog-input, .dialog-select {
  width: 100%; padding: 0.5rem;
  background: var(--bg-primary); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text-primary); box-sizing: border-box;
}
.type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
.type-btn {
  display: flex; flex-direction: column; align-items: center;
  padding: 0.5rem; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-primary); cursor: pointer;
}
.type-btn.active { border-color: var(--accent); }
.dialog-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; }
.btn-cancel { padding: 0.5rem 1rem; border: 1px solid var(--border); background: transparent; border-radius: 6px; cursor: pointer; }
.btn-confirm { padding: 0.5rem 1rem; background: var(--accent); color: #fff; border: none; border-radius: 6px; cursor: pointer; }
</style>

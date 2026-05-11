<template>
  <div
    ref="tagRef"
    :class="['json-tag', 'tag-' + type, { editing: isEditing || isEditingKey, 'tag-computed': computed }]"
  >
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
          <template v-if="type === 'enum'">
            <select v-model="localValue" class="tag-select">
              <option v-for="opt in options" :key="opt.value" :value="opt.value">
                {{ opt.label || opt.value }}
              </option>
            </select>
          </template>
          <template v-else-if="type === 'boolean'">
            <select v-model="localValue" class="tag-select">
              <option :value="true">true</option>
              <option :value="false">false</option>
            </select>
          </template>
          <template v-else-if="type === 'int' || type === 'real'">
            <input
              v-model="localValue"
              type="number"
              :step="type === 'int' ? 1 : 'any'"
              class="tag-input"
              @keyup.enter.stop="$emit('update', parseValue(localValue))"
              @keyup.escape.stop="cancelEdit"
            />
          </template>
          <template v-else-if="type === 'vector'">
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
            <button class="tag-btn save" @click.stop="$emit('update', parseValue(localValue))">✓</button>
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
        <template v-else-if="type === 'vector'">
          <span class="tag-value tag-vector-val">[{{ (value || []).length }}]</span>
        </template>
        <template v-else-if="type === 'object'">
          <span class="tag-value tag-object">{...}</span>
        </template>
        <template v-else-if="type === 'objectref'">
          <span class="tag-value tag-ref">@{{ value || 'null' }}</span>
        </template>
        <template v-else-if="type === 'enum'">
          <span class="tag-value tag-enum">{{ getEnumLabel(value) }}</span>
        </template>
        <template v-else>
          <span class="tag-value tag-string">{{ formatString(value) }}</span>
        </template>

        <span v-if="!computed" class="tag-actions">
          <button class="tag-btn edit" @click.stop="startEdit">✎</button>
          <button class="tag-btn delete" @click.stop="$emit('remove')">✕</button>
        </span>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { default: null },
  type: { type: String, default: 'string' },
  options: { type: Array, default: () => [] },
  computed: { type: Boolean, default: false },
})

const emit = defineEmits(['update', 'remove', 'rename'])

const isEditing = ref(false)
const isEditingKey = ref(false)
const localValue = ref(null)
const localKey = ref('')
const tagRef = ref(null)

const handleClickOutside = (e) => {
  if (isEditing.value && tagRef.value && !tagRef.value.contains(e.target)) {
    cancelEdit()
  }
  if (isEditingKey.value && tagRef.value && !tagRef.value.contains(e.target)) {
    cancelKeyEdit()
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

const formatString = (val) => {
  if (val === null || val === undefined) return 'null'
  return val
}

const formatNumber = (val) => {
  if (val === null || val === undefined) return 'null'
  return String(val)
}

const parseValue = (val) => {
  if (props.type === 'int') return val !== '' ? parseInt(val, 10) : null
  if (props.type === 'real') return val !== '' ? parseFloat(val) : null
  if (props.type === 'vector') return val || []
  if (props.type === 'boolean') return Boolean(val)
  return val
}

const getEnumLabel = (value) => {
  if (!props.options?.length) return value
  const opt = props.options.find((o) => o.value === value)
  return opt ? (opt.label || opt.value) : value
}

const startEdit = () => {
  if (props.readonly || props.computed) return
  if (props.type === 'vector') {
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

const cancelEdit = () => {
  isEditing.value = false
  localValue.value = null
}

const startKeyEdit = () => {
  if (props.readonly || props.computed) return
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
</script>

<style scoped>
.json-tag {
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

.tag-btn:hover {
  opacity: 1;
}
</style>

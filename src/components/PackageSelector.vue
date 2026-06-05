<template>
  <div class="package-selector">
    <div class="file-bar">
      <label class="file-input-label">
        <input
          type="file"
          accept=".md,.json"
          @change="loadPackageFile"
          class="file-input"
        />
        <span class="file-btn">Open File</span>
      </label>
      <div v-if="packageName" class="file-loaded-info">
        <span class="loaded-name">{{ packageName }}</span>
      </div>
      <div v-if="packageError" class="load-error">{{ packageError }}</div>
    </div>

<div class="presets-list">
  <button
    v-for="pkg in presetList"
    :key="pkg.key"
    class="preset-card"
    :class="{ selected: selectedKey === pkg.key }"
    @click="selectPackage(pkg)"
  >
    <span class="preset-icon">{{ pkg.icon }}</span>
    <span class="preset-name">{{ pkg.name }}</span>
    <span class="preset-desc">{{ pkg.description }}</span>
  </button>
</div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { presets } from '../md/compiled'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'select'])

// 本地选中状态 - 监听 prop 变化
const selectedKey = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  selectedKey.value = val
})

// 文件加载状态
const packageName = ref('')
const packageError = ref('')

const loadPackageFile = (event) => {
  const file = event.target.files[0]
  if (!file) return

  packageError.value = ''
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const text = e.target.result
      const result = { name: file.name }
      if (file.name.endsWith('.json')) {
        result.content = JSON.parse(text)
      } else {
        result.md = text
      }
      emit('select', result)
      packageName.value = file.name
    } catch (err) {
      packageError.value = `加载失败: ${err.message}`
      packageName.value = ''
    }
  }
  reader.readAsText(file)
}

// 预设列表
const presetList = Object.entries(presets).map(([key, preset]) => ({
  ...preset,
  key,
}))

const selectPackage = (pkg) => {
  if (selectedKey.value === pkg.key) {
    selectedKey.value = ''
    emit('update:modelValue', '')
    emit('select', null)
  } else {
    // 先清空触发滑出动画
    const prev = selectedKey.value
    if (prev) {
      selectedKey.value = ''
      emit('update:modelValue', '')
    }
    // 等动画完成后加载新 package
    setTimeout(() => {
      selectedKey.value = pkg.key
      emit('update:modelValue', pkg.key)
      emit('select', pkg)
    }, prev ? 100 : 0)
  }
}
</script>

<style scoped>
.package-selector {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-secondary);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.file-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.file-input-label {
  cursor: pointer;
}

.file-btn {
  padding: 0.3rem 0.6rem;
  background: var(--accent);
  border-radius: 4px;
  color: white;
  font-size: 0.7rem;
}

.file-input {
  display: none;
}

.file-loaded-info {
  padding: 0.25rem 0.5rem;
  background: rgba(var(--success-rgb), 0.1);
  border-radius: 4px;
}

.loaded-name {
  font-size: 0.7rem;
  color: var(--success);
}

.load-error {
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
  color: var(--error);
  background: rgba(var(--error-rgb), 0.1);
  border-radius: 4px;
}

.presets-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  overflow-y: auto;
  flex: 1;
}

.preset-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  min-height: 64px;
}

.preset-card:hover {
  border-color: var(--accent);
  background: var(--bg-secondary);
}

.preset-card.selected {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  box-shadow: 0 0 0 1px var(--accent);
}

.preset-icon {
  font-size: 1.75rem;
  flex-shrink: 0;
}

.preset-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.preset-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  flex: 2;
}
</style>

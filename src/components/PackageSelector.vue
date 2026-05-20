<template>
  <div class="package-selector">
    <div class="selector-header">
      <span class="selector-title">{{ title }}</span>
      <div class="header-actions">
        <label class="file-input-label">
          <input
            type="file"
            accept=".md,.json"
            @change="loadPackageFile"
            class="file-input"
          />
          <span class="file-btn">Open</span>
        </label>
        <button
          v-if="selectedPackage"
          class="btn-clear"
          @click="clearSelection"
        >✕ 清除</button>
      </div>
    </div>

    <div v-if="packageName" class="file-loaded-info">
      <span class="loaded-name">{{ packageName }}</span>
    </div>
    <div v-if="packageError" class="load-error">{{ packageError }}</div>

    <div v-if="!selectedPackage" class="presets-grid">
      <button
        v-for="pkg in presetList"
        :key="pkg.key"
        class="preset-card"
        @click="selectPackage(pkg)"
      >
        <span class="preset-icon">{{ pkg.icon }}</span>
        <span class="preset-name">{{ pkg.name }}</span>
        <span class="preset-desc">{{ pkg.description }}</span>
      </button>
    </div>

    <div v-else class="selected-info">
      <span class="selected-icon">{{ selectedPackage.icon }}</span>
      <span class="selected-name">{{ selectedPackage.name }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { presets } from '../md/index'

const props = defineProps({
  title: { type: String, default: '选择 Package' },
})

const emit = defineEmits(['select'])

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

// 预设列表（直接透传，不 pre-parse）
const presetList = Object.entries(presets).map(([key, preset]) => ({
  ...preset,
  key,
}))

const selectedPackage = computed(() => props.modelValue)

const selectPackage = (pkg) => {
  emit('select', pkg)
}

const clearSelection = () => {
  emit('select', null)
}
</script>

<style scoped>
.package-selector {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}

.selector-title {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 600;
}

.btn-clear {
  padding: 0.3rem 0.6rem;
  background: transparent;
  border: 1px solid var(--error);
  border-radius: 4px;
  color: var(--error);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: var(--error);
  color: white;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-input-label {
  cursor: pointer;
}

.file-btn {
  padding: 0.3rem 0.6rem;
  background: var(--accent);
  border-radius: 4px;
  color: white;
}

.file-input {
  display: none;
}

.file-loaded-info {
  padding: 0.5rem 1rem;
  background: rgba(var(--success-rgb), 0.1);
  border-bottom: 1px solid var(--border);
}

.loaded-name {
  font-size: 0.75rem;
  color: var(--success);
}

.load-error {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: var(--error);
  background: rgba(var(--error-rgb), 0.1);
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
  padding: 1rem;
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 1rem 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.preset-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.preset-icon {
  font-size: 1.5rem;
}

.preset-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.preset-desc {
  font-size: 0.65rem;
  color: var(--text-muted);
  line-height: 1.3;
}

.selected-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
}

.selected-icon {
  font-size: 1.2rem;
}

.selected-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--success);
}
</style>

<script setup>
import { computed, inject, ref } from 'vue'
import { getPresetsFromPackage } from '../runtime.js'
import { parsePackage } from '../lib/mdreader.js'
import PropertyEditor from './PropertyEditor.vue'
import PackageSelector from './PackageSelector.vue'
import SwipeSelector from './SwipeSelector.vue'

// ── Events ──────────────────────────────────────────────────────
const emit = defineEmits(['next'])

// ── Injected runtime (provided by App.vue) ───────────────────────
const runtime = inject('runtime')
const resetRuntime = inject('resetRuntime')

// ── Computed helpers: schema / enums / data from runtime ─────────
const currentSchema = computed(() => runtime.value?.schemas || {})
const runtimeEnums  = computed(() => runtime.value?.enums  || {})
const runtimeData   = computed(() => runtime.value?.data   || {})
const envSchema     = computed(() => currentSchema.value?.env || null)

// ── Package selection state ──────────────────────────────────────
const selectedPackageKey = ref('')
const hasPackage        = computed(() => !!selectedPackageKey.value)
const currentPackageData = ref(null)  // 保存已解析的 package 数据

// ── Preset selection state ──────────────────────────────────────
// 从 package 中提取的 presets，独立于 runtime
const extractedPresets = ref({})
const selectedPreset = ref('')
const presetList     = computed(() => {
  const raw = extractedPresets.value
  if (!raw || typeof raw !== 'object') return []
  return Object.entries(raw)
    .filter(([, v]) => v != null && typeof v === 'object')
    .map(([name, v]) => ({ name, ...v }))
})

// ── PackageSelector callback: parse selected package into runtime ──
const onPackageSelected = (pkg) => {
  if (!pkg) return
  selectedPreset.value = ''
  selectedPackageKey.value = pkg.key || pkg.name || ''

  const parsed = pkg.md
    ? parsePackage(pkg.md)
    : { blocks: pkg.content?.blocks || [], ...pkg.content }

  currentPackageData.value = parsed

  const presets = getPresetsFromPackage(parsed)
  extractedPresets.value = { ...presets }
}

// ── Preset selection: 先走 resetRuntime 加载 package，再直接写 env/actors ──
const META_KEYS = new Set(['name', 'label', 'desc', 'actors'])

const currentPresetIndex = ref(0)

const selectPreset = (p) => {
  if (selectedPreset.value === p.name) return
  selectedPreset.value = p.name

  resetRuntime(null, { content: currentPackageData.value })

  const r = runtime.value
  for (const [key, val] of Object.entries(p)) {
    if (META_KEYS.has(key)) continue
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || val === null) {
      r.env[key] = val
    }
  }
  if (Array.isArray(p.actors)) {
    r.actors = p.actors.map(a => ({ ...a }))
  }
}

const onPresetSelected = (index) => {
  const p = presetList.value[index]
  if (!p || selectedPreset.value === p.name) return
  selectPreset(p)
}

// ── Clear loaded package and reset runtime ───────────────────────
const clearPackage = () => {
  selectedPackageKey.value = ''
  selectedPreset.value = ''
  extractedPresets.value = {}
  currentPackageData.value = null
  currentPresetIndex.value = 0
  runtime.value = { env: {}, actors: [], messages: {}, logs: [] }
}

// ── Entity schema shortcut ───────────────────────────────────────
const entitySchema = computed(() =>
  runtime.value?.schemas?.actor
  || runtime.value?.schemas?.entity
  || null
)

// ── Roles / entity templates from runtime ────────────────────────
const roles = computed(() => runtime.value?.roles || {})

// ── Add a new empty entity ────────────────────────────────────────
const addEntity = () => {
  const r = runtime.value
  if (!r.actors) r.actors = []
  const newIndex = r.actors.length + 1
  r.actors.push({ id: 'entity_' + newIndex, name: 'Entity ' + newIndex })
}

// ── Add entity from a role template ─────────────────────────────
const addEntityFromRole = (roleKey) => {
  const r      = runtime.value
  const role   = roles.value[roleKey]
  if (!role) return
  if (!r.actors) r.actors = []
  r.actors.push({ ...role })
}

// ── Remove entity at index ────────────────────────────────────────
const removeEntity = (index) => {
  const r = runtime.value
  if ((r.actors?.length || 0) <= 1) return
  r.actors.splice(index, 1)
}

// ── Navigation ────────────────────────────────────────────────────
const handleNext = () => {
  emit('next')
}
</script>

<template>
  <div class="prepare-stage">

    <div class="prepare-content">
      <div class="package-block">
        <div class="block-header">
          <span class="block-label">Package</span>
          <button
            v-if="hasPackage"
            class="btn-clear-package"
            @click="clearPackage"
          >✕ 清除</button>
        </div>
        <PackageSelector
          v-model="selectedPackageKey"
          @select="onPackageSelected"
        />
      </div>

      <div class="config-block" :class="{ visible: hasPackage }">
        <div class="config-panel">
          <div class="config-header">
            <span class="config-title">Config</span>
          </div>

          <!-- Preset 选择区 -->
          <div class="config-section preset-section" v-if="presetList.length">
            <h3>Preset</h3>
            <SwipeSelector
              v-model="currentPresetIndex"
              :items="presetList"
              @update:model-value="onPresetSelected"
            />
          </div>

          <div class="config-section env-section">
            <h3>Global</h3>
            <PropertyEditor
              v-model="runtime.env"
              :schema="envSchema"
              :enums="runtimeEnums"
              :data-blocks="runtimeData"
            />
          </div>

          <div class="config-section actors-section">
            <h3>Actors</h3>
            <div class="actorslist">
              <div v-for="(entity, index) in runtime?.actors" :key="entity.id || index" class="entity-item">
                <div class="entity-header">
                  <span class="entity-label">{{entity.name}}</span>
                  <button
                    v-if="runtime.actors.length > 1"
                    class="btn-remove-entity"
                    @click="removeEntity(index)"
                  >−</button>
                </div>
                <PropertyEditor
                  v-model="runtime.actors[index]"
                  :schema="currentSchema?.actor || currentSchema?.entity"
                  :enums="runtimeEnums"
                  :data-blocks="runtimeData"
                />
              </div>
              <div class="entity-tabs">
                <button class="btn-add-entity" @click="addEntity">+ 新增实体</button>
                <button
                  v-for="(role, key) in roles"
                  :key="key"
                  class="btn-role"
                  @click="addEntityFromRole(key)"
                >
                  +{{ role.name || key }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="stage-footer">
      <button class="btn-next" @click="handleNext">进入执行</button>
    </div>
  </div>
</template>

<style scoped>
.prepare-stage {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.prepare-content {
  flex: 1;
  display: flex;
  position: relative;
  min-height: 0;
  overflow: hidden;
  padding: 0;
  gap: 0;
  grid-template-columns: unset;
}

/* Package Block */
.package-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  padding: 1rem;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.block-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.btn-clear-package {
  padding: 0.3rem 0.6rem;
  background: transparent;
  border: 1px solid var(--error);
  border-radius: 4px;
  color: var(--error);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear-package:hover {
  background: var(--error);
  color: white;
}

/* Config Block - Floating */
.config-block {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 70%;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateX(100%);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
  opacity: 0;
  z-index: 10;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}

.config-block.visible {
  transform: translateX(0);
  opacity: 1;
}

.config-header {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.config-title {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.config-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.config-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.preset-section {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.config-section h3 {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.6rem;
  flex-shrink: 0;
}

.env-section {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.actors-section {
  flex: 1;
  padding: 0.75rem 1rem;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.actorslist {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.entity-item {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.entity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}

.entity-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-remove-entity {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove-entity:hover {
  background: var(--error);
  color: white;
}

.entity-item :deep(.json-editor) {
  max-height: 160px;
  overflow-y: auto;
}

.btn-add-entity {
  padding: 0.7rem 1rem;
  border: 1px dashed var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-add-entity:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(59, 130, 246, 0.05);
}

.entity-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.btn-role {
  padding: 0.3rem 0.6rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 0.7rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-role:hover {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.env-section :deep(.json-editor),
.actors-section :deep(.json-editor) {
  flex: 1;
  overflow: hidden;
}

.env-section :deep(.tags-container) {
  max-height: none;
  overflow-y: auto;
}

.stage-footer {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--border);
  background: linear-gradient(to top, var(--bg-tertiary), var(--bg-secondary));
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.btn-next {
  padding: 1rem 3rem;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: white;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.35);
  letter-spacing: 0.03em;
}

.btn-next:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
}

.btn-next:active {
  transform: translateY(0);
  box-shadow: 0 2px 10px rgba(59, 130, 246, 0.3);
}

@media (max-width: 900px) {
  .prepare-content {
    flex-direction: column;
  }

  .package-block {
    flex: none;
    min-height: 200px;
  }

  .config-block {
    width: 70%;
    border-left: none;
    border-top: 1px solid var(--border);
    top: auto;
    height: 50%;
    transform: translateY(100%);
  }

  .config-block.visible {
    transform: translateY(0);
  }
}
</style>

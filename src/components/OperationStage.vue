<script setup>
import { ref, computed, inject, watch, onMounted, onUnmounted } from 'vue'
import PropertyEditor from './PropertyEditor.vue'
import LogPanel from './LogPanel.vue'

// ── Injections from App.vue ────────────────────────────────────────
const runtime = inject('runtime')
const logs    = inject('logs', ref([]))

// ── Events ────────────────────────────────────────────────────────
const emit = defineEmits(['done', 'addField'])

// ── Local copies of env/actors (edited in-place before save) ──────
// Initialized from runtime snapshot on mount.
const localEnv    = ref({ ...(runtime.value?.env    || {}) })
const localActors = ref((runtime.value?.actors || []).map(e => ({ ...e })))

// ── UI state ──────────────────────────────────────────────────────
const selectedTab      = ref('env')      // 'env' | 'actors'
const selectedActorTab = ref(0)
const roles            = ref(runtime.value?.roles || {})

// ── Entity schema: base schema merged with dynamically added fields ──
const baseEntitySchema = computed(() =>
  runtime.value?.schemas?.actor
  || runtime.value?.schemas?.entity
  || null
)
const customEntityFields = ref({})
const entitySchema = computed(() => ({
  ...baseEntitySchema.value,
  ...customEntityFields.value,
}))

// ── Enums from runtime ─────────────────────────────────────────────
const runtimeEnums = computed(() => runtime.value?.enums || {})

// ── Handle dynamic field addition on entity ───────────────────────
const handleEntityAddField = ({ key, type, options }) => {
  customEntityFields.value[key] = { type, label: key, options }
}

// ── Ops list derived from runtime.ops ─────────────────────────────
const opsList = computed(() => {
  const r     = runtime.value
  const pkgOps = r?.ops || {}
  return Object.entries(pkgOps).map(([name, config]) => ({
    name,
    label : config.label || name,
    type  : config.type  || 'secondary',
    entry : config.entry || name,
  }))
})

// ── Currently selected actor (written back to runtime on save) ──────
const selectedActor = ref(null)

// ── Polling: detect runtime changes and sync local state ───────────
// lastEnvJson / lastActorsJson track the last-seen JSON to avoid
// unnecessary re-parsing on every poll tick.
let pollInterval    = null
let lastEnvJson     = ''
let lastActorsJson  = ''

// Updates selectedActor and pushes it into runtime.
const updateSelectedActor = () => {
  selectedActor.value = localActors.value[selectedActorTab.value] || null
  if (runtime.value) {
    runtime.value.selectedActor = selectedActor.value
  }
}

// Sync runtime env/actors → local copies.
// Runs on poll interval; only re-assigns when JSON actually changed.
const syncFromRuntime = () => {
  const r = runtime.value
  if (!r) return

  const envJson    = JSON.stringify(r.env    || {})
  const actorsJson = JSON.stringify(r.actors || [])

  if (envJson !== lastEnvJson || actorsJson !== lastActorsJson) {
    lastEnvJson    = envJson
    lastActorsJson = actorsJson
    localEnv.value    = JSON.parse(envJson)
    localActors.value = JSON.parse(actorsJson)
  }

  roles.value = r.roles || {}
}

// ── Update handlers (called by PropertyEditor two-way binding) ──────
const updateEnv = (newEnv) => {
  localEnv.value = newEnv
}

const updateEntity = (index, newEntity) => {
  localActors.value[index] = { ...newEntity }
}

// ── Add new empty entity ────────────────────────────────────────────
const addEntity = () => {
  const newIndex = localActors.value.length + 1
  localActors.value.push({
    id   : 'entity_' + newIndex,
    name : 'Entity ' + newIndex,
  })
  selectedActorTab.value = localActors.value.length - 1
}

// ── Add entity from a role template ────────────────────────────────
const addEntityFromRole = (roleKey) => {
  const role = roles.value[roleKey]
  if (!role) return
  localActors.value.push({ ...role })
  selectedActorTab.value = localActors.value.length - 1
}

// ── Persist local state back into runtime ─────────────────────────
// Called before running any pipeline or before navigating to next stage.
const saveChanges = () => {
  const r = runtime.value
  if (!r) return

  Object.assign(r.env, localEnv.value)
  if (r.actors && Array.isArray(r.actors)) {
    r.actors.splice(0, r.actors.length, ...localActors.value)
  } else {
    r.actors = [...localActors.value]
  }
  updateSelectedActor()
}

// ── Run a named pipeline ───────────────────────────────────────────
// saveChanges is called first to ensure env/actors are up-to-date.
const handleRun = async (pipelineName) => {
  saveChanges()
  await runtime.value?.run?.(pipelineName)
}

// ── Navigate to summary stage ───────────────────────────────────────
const goToSummary = () => {
  saveChanges()
  emit('done')
}

// ── isRunning: derived from runtime ────────────────────────────────
const isRunning = computed(() => runtime.value?.isRunning?.() || false)

// ── Register pipelines into runtime ─────────────────────────────────
// Pipelines are defined in the md package. We call runtime.Pipeline(...)
// here so they are discoverable by runtime.run(name).
const registerPipelines = () => {
  const r = runtime.value
  if (!r?.pipelines || !r.Pipeline) return

  for (const [name, config] of Object.entries(r.pipelines)) {
    // Avoid re-registering already-defined pipelines.
    if (r.Pipeline(name)?.main != null) continue
    r.Pipeline(name, config)
  }
}

// ── Watches ────────────────────────────────────────────────────────
watch(selectedActorTab, updateSelectedActor)
watch(localActors,      updateSelectedActor, { deep: true })
watch(() => localActors.value.length, (newLen) => {
  if (selectedActorTab.value >= newLen && newLen > 0) {
    selectedActorTab.value = newLen - 1
  }
})
// Re-register pipelines if the package's pipeline definitions change.
watch(
  () => runtime.value?.pipelines,
  () => { registerPipelines() },
  { deep: true },
)

// ── Lifecycle ────────────────────────────────────────────────────────
onMounted(() => {
  updateSelectedActor()
  registerPipelines()
  syncFromRuntime()
  pollInterval = setInterval(syncFromRuntime, 100)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div class="operation-stage">

    <div class="data-tabs">
      <button
        :class="['tab-btn', { active: selectedTab === 'env' }]"
        @click="selectedTab = 'env'"
      >
        Env
      </button>
      <button
        :class="['tab-btn', { active: selectedTab === 'actors' }]"
        @click="selectedTab = 'actors'"
      >
        Actors ({{ localActors.length }})
      </button>
    </div>

    <div class="data-panel">
      <div v-show="selectedTab === 'env'" class="data-section">
        <PropertyEditor
          :model-value="localEnv"
          @update:model-value="updateEnv"
        />
      </div>

      <div v-show="selectedTab === 'actors'" class="data-section">
        <div class="actor-actions">
          <div class="actor-tabs">
            <button
              v-for="(entity, index) in localActors"
              :key="entity.id || index"
              :class="['actor-tab', { active: selectedActorTab === index }]"
              @click="selectedActorTab = index"
            >
              {{ entity.name || entity.id || 'Entity ' + (index + 1) }}
            </button>
            <button class="actor-tab actor-tab-add" @click="addEntity">+</button>
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
        <div v-if="localActors.length > 0" class="actor-content">
          <PropertyEditor
            :model-value="localActors[selectedActorTab]"
            @update:model-value="updateEntity(selectedActorTab, $event)"
            :schema="entitySchema"
            :enums="runtimeEnums"
            @add-field="handleEntityAddField"
          />
        </div>
        <div v-else class="actor-empty">
          暂无实体，点击 + 或选择模板添加
        </div>
      </div>
    </div>

    <div class="ops-panel">
      <div class="ops-header">
        &nbsp;Ops <span class="ops-count">{{ opsList.length }}</span>
      </div>
      <div class="ops-buttons">
        <button
          v-for="op in opsList"
          :key="op.name"
          :class="['op-btn', 'op-' + op.type]"
          :disabled="isRunning"
          @click="handleRun(op.entry)"
        >
          {{ op.label }}
        </button>
      </div>

      <LogPanel
        :logs="logs"
        :is-running="isRunning"
        @clear="logs.length = 0"
      />
    </div>

    <div class="stage-footer">
      <button
        class="btn-next-stage"
        @click="goToSummary"
      >
        {{ isRunning ? '...' : 'Summary' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.operation-stage {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1rem;
}

.stage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stage-header h2 {
  margin: 0;
}

.current-op {
  color: var(--accent);
  font-size: 0.9rem;
}

.data-tabs {
  display: flex;
  gap: 0.5rem;
}

.tab-btn {
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px 6px 0 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: var(--bg-tertiary);
}

.tab-btn.active {
  background: var(--bg-secondary);
  color: var(--accent);
  border-bottom-color: var(--bg-secondary);
}

.data-panel {
  flex: 1;
  min-height: 200px;
  background: var(--bg-secondary);
  border-radius: 0 8px 8px 8px;
  overflow: hidden;
}

.data-section {
  height: 100%;
  padding: 1rem;
  overflow-y: auto;
}

.actor-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.actor-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.actor-tab {
  padding: 0.4rem 0.8rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.actor-tab:hover {
  border-color: var(--accent);
}

.actor-tab.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.actor-tab-add {
  background: transparent;
  border-style: dashed;
  color: var(--text-muted);
}

.actor-tab-add:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.role-selector {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-top: 0.5rem;
}

.role-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.btn-role {
  padding: 0.25rem 0.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-role:hover {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.actor-content {
  height: calc(100% - 2.5rem);
}

.actor-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.ops-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.75rem;
}

.ops-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ops-header h4 {
  margin: 0;
}

.ops-count {
  background: var(--accent);
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  font-size: 0.7rem;
}

.ops-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.op-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.op-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.op-primary { background: var(--accent); color: white; }
.op-secondary { background: var(--bg-tertiary); color: var(--text-primary); }
.op-success { background: var(--success); color: white; }
.op-warning { background: var(--warning); color: white; }
.op-info { background: #3d8bc9; color: white; }

.stage-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.btn-next-stage {
  padding: 0.5rem 1.5rem;
  background: var(--accent);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-next-stage:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-next-stage:hover:not(:disabled) {
  opacity: 0.9;
}
</style>

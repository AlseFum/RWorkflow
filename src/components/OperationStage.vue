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
        <JsonEditor
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
          <JsonEditor
            :model-value="localActors[selectedActorTab]"
            @update:model-value="updateEntity(selectedActorTab, $event)"
            :schema="entitySchema"
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
        :logs="runtime.logs"
        :is-running="isRunning"
        @clear="runtime.logs.length = 0"
      />
    </div>

    <div class="stage-footer">
      <button
        class="btn-next-stage"
        :disabled="isRunning || !runtime.lastOp()"
        @click="goToSummary"
      >
        {{ isRunning ? '...' : 'Summary' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted } from 'vue'
import JsonEditor from './JsonEditor.vue'
import LogPanel from './LogPanel.vue'

const runtime = inject('runtime')
const pack = inject('pack')
const emit = defineEmits(['done', 'addField'])

const localEnv = ref({ ...pack.value.env })
const localActors = ref(pack.value.actors.map((e) => ({ ...e })) || [])
const selectedTab = ref('env')
const selectedActorTab = ref(0)
const roles = ref(pack.value.roles || {})
const entitySchema = ref({
  id: { type: 'string', label: 'ID' },
  name: { type: 'string', label: '名称' },
})

const handleEntityAddField = ({ key, type }) => {
  entitySchema.value[key] = { type, label: key }
}

const opsList = computed(() => {
  const pkgOps = pack.value.ops || {}
  return Object.entries(pkgOps).map(([name, config]) => ({
    name,
    label: config.label || name,
    type: config.type || 'secondary',
    entry: config.entry || name,
  }))
})

const selectedActor = computed(() => {
  return localActors.value[selectedActorTab.value] || null
})

const isRunning = computed(() => runtime.isRunning())

watch(() => localActors.value.length, (newLen) => {
  if (selectedActorTab.value >= newLen && newLen > 0) {
    selectedActorTab.value = newLen - 1
  }
})

watch(() => pack.value.pipelines, () => {
  runtime.registerPipelines()
}, { deep: true })

const updateEnv = (newEnv) => {
  localEnv.value = newEnv
}

const updateEntity = (index, newEntity) => {
  localActors.value[index] = { ...newEntity }
}

const addEntity = () => {
  const newIndex = localActors.value.length + 1
  localActors.value.push({
    id: 'entity_' + newIndex,
    name: 'Entity ' + newIndex,
  })
  selectedActorTab.value = localActors.value.length - 1
}

const addEntityFromRole = (roleKey) => {
  const role = roles.value[roleKey]
  if (!role) return
  localActors.value.push({ ...role })
  selectedActorTab.value = localActors.value.length - 1
}

const saveChanges = () => {
  Object.assign(pack.value.env, localEnv.value)
  pack.value.actors.splice(0, pack.value.actors.length, ...localActors.value)
}

const handleRun = async (pipelineName) => {
  saveChanges()
  await runtime.run(pipelineName)
}

onMounted(() => {
  runtime.registerPipelines()
  runtime.run('prepare')
})

const goToSummary = () => {
  saveChanges()

  pack.value.operationEnv = { ...localEnv.value }
  pack.value.operationActors = [...localActors.value]
  pack.value.operationSelectedActor = selectedActor.value

  emit('done')
}
</script>

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

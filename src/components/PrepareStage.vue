<template>
  <div class="prepare-stage">
    <div class="stage-header">
      <h2>阶段一：配置</h2>
    </div>

    <div class="prepare-content">
      <div class="config-section package-section">
        <h3>Package</h3>
        <PackageSelector
          title="预设 Package"
          @select="onPresetSelect"
        />
      </div>

      <div class="config-section env-section">
        <h3>Global</h3>
        <JsonEditor
          v-model="runtime.env"
          :schema="currentSchema?.env"
          :messages="runtime.messages || {}"
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
            <JsonEditor
              v-model="runtime.actors[index]"
              :schema="currentSchema?.entity"
              :messages="runtime.messages || {}"
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

      <div v-if="Object.keys(runtime.schemas || {}).length > 0" class="config-section schemas-section">
        <h3>已加载 Schema</h3>
        <div class="schemas-preview">
          <span v-for="(s, key) in runtime.schemas" :key="key" class="schema-tag">{{ key }}</span>
        </div>
      </div>
    </div>

    <div class="stage-footer">
      <button class="btn-next" @click="handleNext">进入执行</button>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import JsonEditor from './JsonEditor.vue'
import PackageSelector from './PackageSelector.vue'

const emit = defineEmits(['next'])
const runtime = inject('runtime')
const resetRuntime = inject('resetRuntime')

const currentSchema = computed(() => runtime.value?.schemas || {
  env: {
  },
  entity: {
  },
})


const onPresetSelect = (preset) => {
  resetRuntime(preset)
}
//===============================================
const addEntity = () => {
  const r = runtime.value
  if (!r.actors) r.actors = []
  const newIndex = r.actors.length + 1
  r.actors.push({
    id: 'entity_' + newIndex,
    name: 'Entity ' + newIndex,
  })
}
const roles = computed(() => runtime.value?.roles || {})

const addEntityFromRole = (roleKey) => {
  const r = runtime.value
  const role = roles.value[roleKey]
  if (!role) return
  if (!r.actors) r.actors = []
  r.actors.push({ ...role })
}

const removeEntity = (index) => {
  const r = runtime.value
  if ((r.actors?.length || 0) <= 1) return
  r.actors.splice(index, 1)
}
//=================================================
const handleNext = () => {
  emit("next")
}
</script>

<style scoped>
.prepare-stage {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.prepare-content {
  flex: 1;
  padding: 1.5rem;
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: auto 1fr;
  gap: 1.25rem;
  overflow: hidden;
}

.config-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.config-section.package-section {
  grid-row: 1 / 3;
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
  grid-column: 2;
  grid-row: 1;
}

.actors-section {
  grid-column: 2;
  grid-row: 2;
  min-height: 0;
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

.config-section.schemas-section {
  grid-column: 2;
  grid-row: 1;
}

.schemas-preview {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.schema-tag {
  padding: 0.3rem 0.6rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .prepare-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
    overflow-y: auto;
  }
  
  .config-section.package-section {
    grid-row: auto;
  }
  
  .env-section,
  .actors-section,
  .schemas-section {
    grid-column: 1;
  }
  
  .actors-section {
    grid-row: 3;
    min-height: 300px;
  }
}
</style>

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
          @click="runPipeline(op.entry)"
        >
          {{ op.label }}
        </button>
      </div>

      <LogPanel
        :logs="logs"
        :is-running="isRunning"
        @clear="logs = []"
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

<script setup>
// ============================================================
// 依赖导入
// ============================================================
import { ref, computed, inject, watch } from 'vue'
import JsonEditor from './JsonEditor.vue'
import LogPanel from './LogPanel.vue'
import { createPipelineRuntime } from '../pipeline.js'
import { registerDefaultPipelines } from '../setup_pipeline.js'

const pack = inject('pack')
const emit = defineEmits(['done'])

// ============================================================
// 状态定义
// ============================================================
const defaultOps = {
  validate: { label: '验证配置', type: 'secondary', entry: 'validate' }
}

const localEnv = ref({ ...pack.value.env })
const localActors = ref(pack.value.actors.map(e => ({ ...e })) || [])
const isRunning = ref(false)
const selectedTab = ref('env')
const selectedActorTab = ref(0)
const roles = ref(pack.value.roles || {})

const logs = ref([])
const stats = ref({})

const currentOp = ref('')
const lastOp = ref('')

const entitySchema = ref({
  id: { type: 'string', label: 'ID' },
  name: { type: 'string', label: '名称' },
  active: { type: 'boolean', label: '激活' },
  weight: { type: 'real', label: '权重' },
})

const handleEntityAddField = ({ key, type }) => {
  entitySchema.value[key] = { type, label: key }
}

// ============================================================
// 计算属性
// ============================================================
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

watch(() => localActors.value.length, (newLen) => {
  if (selectedActorTab.value >= newLen && newLen > 0) {
    selectedActorTab.value = newLen - 1
  }
})

// 切换 package 时重新注册默认 pipelines
watch(() => pack.value.pipelines, () => {
  registerDefaultPipelines(Pipeline)
}, { deep: true })

// ============================================================
// 数据更新方法
// ============================================================
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
    active: true,
    weight: 1.0,
  })
  selectedActorTab.value = localActors.value.length - 1
}

const addEntityFromRole = (roleKey) => {
  const role = roles.value[roleKey]
  if (!role) return
  const newEntity = Object.assign({}, role)
  localActors.value.push(newEntity)
  selectedActorTab.value = localActors.value.length - 1
}

const saveChanges = () => {
  Object.assign(pack.value.env, localEnv.value)
  pack.value.actors.splice(0, pack.value.actors.length, ...localActors.value)
}

// ============================================================
// Pipeline 运行时初始化
// ============================================================
const { Pipeline, runPipeline: run } = createPipelineRuntime()
pack.value.pipelineRuntime = { Pipeline, run }

// 辅助函数：字符串插值
const interpolate = (str, ctx) => {
  if (!str) return str
  return str.replace(/\{([^}]+)\}/g, (_, expr) => {
    try {
      return eval(expr)
    } catch {
      return expr
    }
  })
}

// 从步骤配置生成 pipeline 函数
const createStepsRunner = (steps) => {
  return (ctx) => {
    globalThis.ctx=ctx
    for (const step of steps) {
      if(step == null)continue;
      switch (step.type) {
        case 'log':
          ctx.log?.(interpolate(step.message, ctx), step.level || 'info')
          break
        case 'delay':
          ctx.delay?.(step.ms)
          break
        case 'setEnv':
          try {
            const expr = step.value
            ctx.env[step.key] = eval(expr)
          } catch {
            ctx.env[step.key] = step.value
          }
          break
        case 'each':
          const items = ctx[step.items] || []
          for (const item of items) {
            const loopCtx = { ...ctx, item }
            for (const bodyStep of step.body || []) {
              if (bodyStep.type === 'log') {
                ctx.log?.(interpolate(bodyStep.message, loopCtx), bodyStep.level || 'info')
              } else if (bodyStep.type === 'delay') {
                ctx.delay?.(bodyStep.ms)
              }
            }
          }
          break
        default:
          const res=new Function('ctx', step.body??step).call(ctx, ctx)
          if(res!=null && res!==undefined){
            ctx.log(res)
          }
          break
      }
    }
  }
}

// stat 函数：用于统计汇总
const stat = (name, value) => {
  if (!stats.value[name]) {
    stats.value[name] = { count: 0, total: 0 }
  }
  stats.value[name].count++
  stats.value[name].total += Number(value) || 0
  addLog(`[STAT] ${name}: ${value}`, 'data')
}

// ============================================================
// Pipeline 注册
// ============================================================
// 初始化默认 ops
if (Object.keys(pack.value.ops || {}).length === 0) {
  Object.assign(pack.value, { ops: { ...defaultOps } })
}

// 注册默认 pipeline 函数（会在 pack.pipelines 注册后再次调用以覆盖默认值）


// ============================================================
// 日志和执行
// ============================================================
const addLog = (msg, type = 'info') => {
  logs.value.push({ time: new Date().toLocaleTimeString(), msg, type })
}

const delay = (ms) => new Promise(r => setTimeout(r, ms))

const runPipeline = async (pipelineName) => {
  if (isRunning.value) return

  saveChanges()

  const p = Pipeline(pipelineName)
  if (!p) {
    addLog(`Pipeline "${pipelineName}" 未定义`, 'error')
    return
  }

  isRunning.value = true
  currentOp.value = pipelineName

  try {
    await run(pipelineName, {
      env: localEnv.value,
      actors: localActors.value,
      selectedActor: selectedActor.value,
      log: addLog,
      delay,
      stat,
    })
    lastOp.value = pipelineName
  } catch (err) {
    addLog(`错误: ${err.message}`, 'error')
  }

  currentOp.value = ''
  isRunning.value = false
}
// ====================
// 注册 pack 中的 pipelines
if (pack.value.pipelines) {
  for (const [name, config] of Object.entries(pack.value.pipelines)) {
    //实际上我们需要一些特殊处理，来Mount到之前的pipelines上。
    Pipeline(name, [createStepsRunner(config.steps || [])]).append(65535,"summary")
    if (!pack.value.ops[name]) {
      pack.value.ops[name] = { label: name, type: 'secondary', entry: name }
    }

    // 第二种模式
    let pos=(config.pos??"").split(' ')
    let m=Pipeline(pos[0]);
    if(!m)continue;
    let prio=Number(pos[2]);
    if(pos[1]==='append'){
      m.append(prio,createStepsRunner(config.do||[]));
    }else if(pos[1]==='prepend'){
      m.prepend(prio,createStepsRunner(config.do||[]));
    }
    
  }
}

// 注册默认 pipeline（会覆盖同名配置）
registerDefaultPipelines(Pipeline)

// 暴露 stats 和 selectedActor 给外部访问
pack.value.stats = stats
pack.value.selectedActor = selectedActor

// 进入 Summary 页面前执行 summary pipeline
const goToSummary = async () => {
  if (isRunning.value || !lastOp.value) return
  
  isRunning.value = true
  currentOp.value = 'summary'
  
  // 保存上下文数据到 pack，供 LogStage 使用
  pack.value.operationEnv = { ...localEnv.value }
  pack.value.operationActors = [...localActors.value]
  pack.value.operationSelectedActor = selectedActor.value
  pack.value.operationLogs = [...logs.value]
  
  isRunning.value = false
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

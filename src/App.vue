<template>
  <div class="app">

    <!-- ============================================================
      共享 —— 阶段指示器 & 模式切换（正常 / Test 共用）
      ============================================================ -->
    <div class="stage-indicator">
      <!-- 正常模式：阶段进度点 -->
      <template v-if="!testMode">
        <div :class="dot1Class">
          <span class="dot-num">1</span>
          <span class="dot-label">Prepare</span>
        </div>
        <div :class="line1Class"></div>
        <div :class="dot2Class">
          <span class="dot-num">2</span>
          <span class="dot-label">Operation</span>
        </div>
        <div :class="line2Class"></div>
        <div :class="dot3Class">
          <span class="dot-num">3</span>
          <span class="dot-label">Summary</span>
        </div>
      </template>
      <!-- Test 模式：标签 -->
      <span v-else class="test-badge">PropertyEditor TEST</span>
      <!-- 切换按钮 -->
      <button class="test-toggle" @click="testMode = !testMode">
        {{ testMode ? '← App' : 'Test' }}
      </button>
    </div>

    <!-- ====== 正常使用 —— 阶段视图 ====== -->
    <div v-if="!testMode" class="stage-content">
      <PrepareStage v-if="stage === 'prepare'" @next="handleNext" />
      <OperationStage v-else-if="stage === 'run'" @done="handleDone" />
      <LogStage v-else-if="stage === 'summary'" @reset="handleReset" />
    </div>

    <!-- ====== Test 模式 —— PropertyEditor 调试视图 ====== -->
    <div v-else class="test-layout">
      <!-- 输入面板 -->
      <div class="test-controls">
        <div class="test-field" v-for="f in testFields" :key="f.key">
          <div class="test-field-header">
            <span class="test-field-label">{{ f.key }}</span>
            <span v-if="testErrors[f.key]" class="test-parse-error">{{ testErrors[f.key] }}</span>
          </div>
          <JsonEditor
            class="test-cm"
            :model-value="testRaw[f.key]"
            @update:model-value="v => onTestInput(f.key, v)"
          />
        </div>
      </div>
      <!-- 编辑器面板 -->
      <div class="test-editor">
        <PropertyEditor
          v-model="testParsed.modelValue"
          :schema="testParsed.schema"
          :enums="testParsed.enums"
          :data-blocks="testParsed.dataBlocks"
        />
      </div>
      <!-- 调试输出面板 -->
      <div class="test-debug">
        <h3>modelValue</h3>
        <pre>{{ JSON.stringify(testParsed.modelValue, null, 2) }}</pre>
        <h3>schema</h3>
        <pre>{{ JSON.stringify(testParsed.schema, null, 2) }}</pre>
        <h3>enums</h3>
        <pre>{{ JSON.stringify(testParsed.enums, null, 2) }}</pre>
        <h3>dataBlocks</h3>
        <pre>{{ JSON.stringify(testParsed.dataBlocks, null, 2) }}</pre>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, provide, computed, reactive, defineAsyncComponent, watch } from 'vue'
import JSON5 from 'json5'

// 正常组件
import PrepareStage from './components/PrepareStage.vue'
import OperationStage from './components/OperationStage.vue'
import LogStage from './components/LogStage.vue'

// Test 组件
import PropertyEditor from './components/PropertyEditor.vue'
const JsonEditor = defineAsyncComponent(() => import('./components/JsonEditor.vue'))

import { createInstance } from './runtime.js'
import { parsePackage } from './lib/mdreader.js'

// ============================================================
// 状态声明
// ============================================================
const stage = ref('prepare')
const testMode = ref(false)

// ============================================================
// 正常运行 —— 运行时状态 & 控制逻辑
// ============================================================

const logsRef = ref([])
const statsRef = ref({})
const domRefs = {
  get logs() { return logsRef.value },
  get stats() { return statsRef.value },
  addLog: (msg, type) => {
    logsRef.value.push({ msg, type })
    console.log(`[log ${type??""}]`, msg)
  },
  addTLog: (msg, type) => {
    logsRef.value.push({ time: new Date().toLocaleTimeString(), msg, type })
    console.log(`[log ${new Date().toLocaleTimeString()} ${type}]`, msg)
  },
}

const runtime = ref({ env: {}, actors: [], messages: {}, logs: [] })

const resetRuntime = (setting = null, preset = null) => {
  try {
    let parsed = { blocks: [] }
    let rawPkg = null
    if (preset) {
      if (preset.md) {
        rawPkg = preset.md
        parsed = parsePackage(preset.md)
      } else if (preset.content) {
        rawPkg = preset.content
        parsed = { blocks: preset.content.blocks || [], ...preset.content }
      }
    }
    const newRuntime = createInstance(parsed, domRefs, {}, setting?.presetName)
    if (!newRuntime.env) newRuntime.env = {}
    if (!newRuntime.messages) newRuntime.messages = {}
    if (rawPkg) newRuntime._rawPkg = rawPkg
    if (setting) {
      if (setting.env) Object.assign(newRuntime.env, setting.env)
      if (setting.actors?.length) {
        newRuntime.actors = setting.actors.map(a => ({ ...a }))
      }
      if (setting.selectedActor) newRuntime.selectedActor = setting.selectedActor
      if (setting._rawPkg) newRuntime._rawPkg = setting._rawPkg
    }
    runtime.value = newRuntime
    logsRef.value = domRefs.logs
    statsRef.value = domRefs.stats
  } catch (err) {
    console.error('[resetRuntime error]', err)
  }
}

resetRuntime(null, null)

provide('runtime', runtime)
provide('logs', logsRef)
provide('stats', statsRef)
provide('resetRuntime', resetRuntime)

// 正常阶段切换
const handleNext = () => { stage.value = 'run' }
const handleDone = () => { stage.value = 'summary' }
const handleReset = () => { stage.value = 'prepare' }

// ============================================================
// 正常视图 —— 阶段指示器样式
// ============================================================

const dot1Class = computed(() => {
  let c = 'stage-dot'
  if (stage.value === 'prepare') c += ' active'
  if (stage.value !== 'prepare') c += ' done'
  return c
})
const line1Class = computed(() => stage.value !== 'prepare' ? 'stage-line active' : 'stage-line')
const dot2Class = computed(() => {
  let c = 'stage-dot'
  if (stage.value === 'run') c += ' active'
  if (stage.value === 'summary') c += ' done'
  return c
})
const line2Class = computed(() => stage.value === 'summary' ? 'stage-line active' : 'stage-line')
const dot3Class = computed(() => stage.value === 'summary' ? 'stage-dot active' : 'stage-dot')

// ============================================================
// Test 模式 —— 数据 & 解析
// ============================================================

const defaultModel = {
  id: 'char_001',
  name: '猎人 Tom',
  role: 'Solider',
  rank: 'rare',
  level: 8,
  health: 100,
  mana: 50,
  attack: 25,
  wep: 'p.B',
}

const defaultSchema = {
  id:      { type: 'string', label: 'ID', readOnly: true },
  name:    { type: 'string', label: '名称' },
  role:    { type: 'enum:herorole',     label: '英雄职业' },
  rank:    { type: 'enum:rank',         label: '品阶' },
  wep:     { type: 'objectref:p' },
  level:   { type: 'int',     label: '等级' },
  health:  { type: 'int',     label: '生命值' },
  mana:    { type: 'int',     label: '法力值' },
  attack:  { type: 'int',     label: '攻击力' },
}

const defaultEnums = {
  herorole: { Solider: '战士', Mage: '法师', Priest: '祭司', Rogue: '盗贼' },
  rank:     { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' },
}

const defaultDataBlocks = {
  weapon: {
    WiseWand:   { title: '智慧之杖', desc: '蕴含魔力的法杖，提升智力', DMG: 5,  INT: 3 },
    BravoSword: { title: '勇者之剑', desc: '锋利的长剑，提升力量', ATK: 2,  STR: 1 },
    WoodBow:    { title: '木制短弓', desc: '轻便的远程武器', ATK: 1,  DEX: 2 },
  },
  p:{
    B:{
      title:"Word B"
    }
  }
}

const fmt = (obj) => JSON5.stringify(obj, null, 2)

const testFields = [
  { key: 'modelValue' },
  { key: 'schema' },
  { key: 'enums' },
  { key: 'dataBlocks' },
]

const defaults = {
  modelValue: defaultModel,
  schema: defaultSchema,
  enums: defaultEnums,
  dataBlocks: defaultDataBlocks,
}

const testRaw = reactive({
  modelValue: fmt(defaultModel),
  schema: fmt(defaultSchema),
  enums: fmt(defaultEnums),
  dataBlocks: fmt(defaultDataBlocks),
})

const testParsed = reactive({
  modelValue: { ...defaultModel },
  schema: { ...defaultSchema },
  enums: { ...defaultEnums },
  dataBlocks: { ...defaultDataBlocks },
})

const testErrors = reactive({})

const safeParse = (key, raw) => {
  try {
    const v = JSON5.parse(raw)
    if (v === null || typeof v !== 'object') throw new Error('must be an object')
    testErrors[key] = ''
    testParsed[key] = v
  } catch (e) {
    testErrors[key] = e.message
  }
}

const onTestInput = (key, raw) => {
  testRaw[key] = raw
  safeParse(key, raw)
}

// sync PropertyEditor edits back to raw JSON text
watch(() => testParsed.modelValue, (v) => { testRaw.modelValue = fmt(v) }, { deep: true })
watch(() => testParsed.schema,     (v) => { testRaw.schema     = fmt(v) }, { deep: true })
watch(() => testParsed.enums,      (v) => { testRaw.enums      = fmt(v) }, { deep: true })
watch(() => testParsed.dataBlocks, (v) => { testRaw.dataBlocks = fmt(v) }, { deep: true })

</script>

<style>
/* ====== 共享 —— 阶段指示器 & 切换按钮 ====== */
.stage-indicator {
  flex-shrink: 0;
}
.test-badge {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.05em;
}
.test-toggle {
  margin-left: auto;
  padding: 0.3rem 0.8rem;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: transparent;
  color: var(--accent);
  font-family: inherit;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s;
}
.test-toggle:hover {
  background: var(--accent);
  color: white;
}

/* ====== Test 模式 —— 布局与面板样式 ====== */
.test-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 260px;
  gap: 0;
  overflow: hidden;
  min-height: 0;
}

.test-controls {
  background: var(--bg-primary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.test-field {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border);
  flex: 1;
  min-height: 0;
}

.test-field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0.6rem;
  flex-shrink: 0;
}

.test-field-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.test-parse-error {
  font-size: 0.6rem;
  color: var(--error);
}

.test-cm {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.test-editor {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 0.75rem;
}

.test-debug {
  background: var(--bg-primary);
  overflow-y: auto;
  padding: 0.75rem;
}

.test-debug h3 {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.75rem;
  margin-bottom: 0.3rem;
}

.test-debug h3:first-child { margin-top: 0; }

.test-debug pre {
  font-size: 0.6rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.4;
}
</style>

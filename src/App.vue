<template>
  <div class="app">
    <div class="stage-indicator">
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
    </div>

    <div class="stage-content">
      <PrepareStage v-if="stage === 'prepare'" @next="handleNext" />
      <OperationStage v-else-if="stage === 'run'" @done="handleDone" />
      <LogStage v-else-if="stage === 'summary'" @reset="handleReset" />
    </div>
  </div>
</template>

<script setup>
import { ref, provide, computed } from 'vue'
import PrepareStage from './components/PrepareStage.vue'
import OperationStage from './components/OperationStage.vue'
import LogStage from './components/LogStage.vue'
import { createInstance } from './runtime.js'
import { parsePackage } from './mdreader.js'

const stage = ref('prepare')

// logs 独立引用，确保跨组件共享同一数组
const logsRef = ref([])

// stats 独立引用，确保跨组件共享
const statsRef = ref({})

// domRefs
const domRefs = {
  logs: logsRef.value,
  stats: statsRef.value,
  addLog: (msg, type) => console.log(`[log ${type??""}]`, msg),
  addTLog: (msg, type) => console.log(`[log ${new Date().toLocaleTimeString()} ${type}]`, msg),
}

// runtime ref - 默认空对象避免 null
const runtime = ref({ env: {}, actors: [], messages: {}, logs: [] })

// 重置 runtime：每次选择 preset 时调用
const resetRuntime = (preset = {}) => {
  let parsed = { blocks: [] }
  if (preset.md) {
    parsed = parsePackage(preset.md)
  } else if (preset.content) {
    parsed = { blocks: preset.content.blocks || [], ...preset.content }
  }

  const newRuntime = createInstance(parsed, domRefs)
  if (!newRuntime.env) newRuntime.env = {}
  if (!newRuntime.messages) newRuntime.messages = {}

  runtime.value = newRuntime

  // 同步 logs 和 stats 引用
  logsRef.value = domRefs.logs
  statsRef.value = domRefs.stats
}

// 初始化
resetRuntime({})

// 暴露给子组件
provide('runtime', runtime)
provide('logs', logsRef)
provide('stats', statsRef)
provide('resetRuntime', resetRuntime)

const handleNext = () => {
  stage.value = 'run'
}

const handleDone = () => {
  stage.value = 'summary'
}

const handleReset = () => {
  stage.value = 'prepare'
}

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
</script>

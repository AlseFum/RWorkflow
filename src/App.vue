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
import { ref, computed, provide, reactive } from 'vue'
import PrepareStage from './components/PrepareStage.vue'
import OperationStage from './components/OperationStage.vue'
import LogStage from './components/LogStage.vue'
import { createInstance } from './runtime.js'

const stage = ref('prepare')
const pack = reactive({
  env: {},
  actors: [],
  ops: {},
  schemas: {},
  messages: {},
  pipelines: {},
  roles: {},
})

const runtime = ref(createInstance(
  {},
  {
    addLog: (msg, type) => console.log(`[${type}]`, msg),
    addTLog: (msg, type) => console.log(`[${new Date().toLocaleTimeString()}][${type}]`, msg),
  }
))

provide('runtime', runtime)
provide('pack', pack)

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

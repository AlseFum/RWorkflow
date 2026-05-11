<template>
  <div class="log-panel">
    <div class="log-header">
      <button v-if="logs.length" class="btn-clear" @click="$emit('clear')">清除</button>
    </div>
    <div ref="container" class="log-container">
      <LogLine
        v-for="(log, index) in logs"
        :key="index"
        :log="log"
      />
      <div v-if="isRunning" class="log-item log-running">
        <span class="log-cursor">▌</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import LogLine from './LogLine.vue'

const props = defineProps({
  logs: { type: Array, default: () => [] },
  isRunning: { type: Boolean, default: false }
})

defineEmits(['clear'])

const container = ref(null)

watch(() => props.logs.length, async () => {
  await nextTick()
  if (container.value) {
    container.value.scrollTop = container.value.scrollHeight
  }
})
</script>

<style scoped>
.log-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 150px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.log-header h4 {
  margin: 0;
}

.btn-clear {
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  border-color: var(--error);
  color: var(--error);
}

.log-container {
  flex: 1;
  min-height: 150px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.75rem;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.8rem;
}

.log-running {
  color: var(--accent);
}

.log-cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>

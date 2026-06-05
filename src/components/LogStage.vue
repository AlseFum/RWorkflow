<template>
  <div class="log-stage">
    <div class="stage-header">

      <span class="ok-badge">OK</span>
    </div>

    <div class="log-content">
      <div class="summary-panel">
        <h4>执行摘要</h4>
        <div class="summary-stats">
          <div class="stat-item">
            <span class="stat-label">操作</span>
            <span class="stat-value">{{ runtime?.value?.lastOp?.() || 'N/A' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">环境字段</span>
            <span class="stat-value">{{ Object.keys(runtime?.value?.env || {}).length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">实体数量</span>
            <span class="stat-value">{{ runtime?.value?.actors?.length || 0 }}</span>
          </div>
        </div>

        <template v-if="statsEntries.length > 0">
          <h4 class="stats-title">统计数据</h4>
          <div class="summary-stats">
            <div v-for="[name, data] in statsEntries" :key="name" class="stat-item">
              <span class="stat-label">{{ name }}</span>
              <span class="stat-value stat-stat">{{ data.total }} <span class="stat-count">({{ data.count }})</span></span>
            </div>
          </div>
        </template>

        <div class="stat-item stat-success">
          <span class="stat-label">状态</span>
          <span class="stat-value status-ok">SUCCESS</span>
        </div>
      </div>

      <div class="logs-panel">
        <div ref="logsContainer" class="logs-container">
          <div
            v-for="(log, index) in logs"
            :key="index"
            :class="['log-item', 'log-' + log.type]"
          >
            <span v-if="log.time" class="log-time">[{{ log.time }}]</span>
            <span class="log-msg">{{ log.msg }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="stage-footer">
      <button class="btn-reset" @click="emit('reset')">OK</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, inject } from 'vue'

const runtime = inject('runtime')
const logs = inject('logs', ref([]))
const stats = inject('stats', ref({}))
const emit = defineEmits(['reset'])

const logsContainer = ref(null)

const statsEntries = computed(() => {
  return Object.entries(stats.value || {})
})

const scrollBottom = () => {
  if (logsContainer.value) {
    logsContainer.value.scrollTop = logsContainer.value.scrollHeight
  }
}

const showSummary = async () => {
  if (typeof runtime.value?.run !== 'function') return
  if (!runtime.value?._pipelines?.summary) {
    nextTick(() => scrollBottom())
    return
  }
  await runtime.value.run('summary')
  nextTick(() => scrollBottom())
}

onMounted(() => {
  showSummary()
})
</script>

<style scoped>
.stats-title {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border);
}

.stat-stat {
  color: var(--accent);
  font-weight: 600;
}

.stat-count {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: normal;
}

.stat-success {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border);
}
</style>

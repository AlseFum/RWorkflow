<template>
  <div class="log-stage">
    <div class="stage-header">
      <h2>阶段三：收尾</h2>
      <span class="ok-badge">OK</span>
    </div>

    <div class="log-content">
      <div class="summary-panel">
        <h4>执行摘要</h4>
        <div class="summary-stats">
          <div class="stat-item">
            <span class="stat-label">操作</span>
            <span class="stat-value">{{ pack.op || 'N/A' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">环境字段</span>
            <span class="stat-value">{{ Object.keys(pack.env || {}).length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">实体数量</span>
            <span class="stat-value">{{ pack.actors?.length || 0 }}</span>
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
          <div v-for="(log, index) in logs" :key="index" :class="'log-item log-' + log.type">
            <span class="log-time">[{{ log.time }}]</span>
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
// ============================================================
// 依赖导入
// ============================================================
import { ref, computed, onMounted, nextTick, inject } from 'vue'

// ============================================================
// 状态定义
// ============================================================
const pack = inject('pack')
const emit = defineEmits(['reset'])

const logs = ref([])
const logsContainer = ref(null)
const isRunning = ref(false)

// ============================================================
// 计算属性
// ============================================================
// 从 pack 获取统计信息
const statsEntries = computed(() => {
  const s = pack.value.stats?.value || pack.value.stats || {}
  return Object.entries(s)
})

// ============================================================
// 方法
// ============================================================
const addLog = (msg, type = 'info') => {
  logs.value.push({ time: new Date().toLocaleTimeString(), msg, type })
  nextTick(() => {
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight
    }
  })
}

const delay = (ms) => new Promise(r => setTimeout(r, ms))

const showSummary = async () => {
  isRunning.value = true

  const { run } = pack.value.pipelineRuntime || {}
  if (run) {
    console.log("running summary")
    try {
      await run('summary', {
        env: pack.value.operationEnv,
        actors: pack.value.operationActors,
        selectedActor: pack.value.operationSelectedActor,
        log: addLog,
        delay,
        stat: (name, value) => {
          // stat 已经在 OperationStage 中处理
        },
      })
    } catch (err) {
      addLog(`Summary pipeline 错误: ${err.message}`, 'error')
    }
  }
  isRunning.value = false
}

// ============================================================
// 生命周期
// ============================================================
onMounted(() => {
  // 将 OperationStage 的日志复制过来
  if (pack.value.operationLogs) {
    logs.value = [...pack.value.operationLogs]
  }
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

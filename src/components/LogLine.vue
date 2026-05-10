<template>
  <div :class="['log-item', 'log-' + log.type]">
    <span class="log-time">[{{ log.time }}]</span>
    <span class="log-msg">{{ log.msg }}</span>
  </div>
</template>

<script setup>
defineProps({
  log: { type: Object, required: true }
})
</script>

<style scoped>
.log-item {
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  margin: 0 -0.5rem;
  border-radius: 4px;
  cursor: default;
  transition: background-color 0.15s;
}

.log-item:hover {
  background-color: var(--bg-tertiary);
}

.log-time {
  color: var(--text-muted);
}

.log-start { color: var(--accent); }
.log-step { color: var(--text-secondary); }
.log-data { color: var(--text-muted); }
.log-entity { color: var(--warning); }
.log-success { color: var(--success); }
.log-error { color: var(--error); }
.log-info { color: var(--text-primary); }
</style>

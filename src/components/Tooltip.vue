<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="tipRef"
      class="tooltip-box"
      :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
    >
      <slot />
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  show: Boolean,
  anchor: { default: null },
})

const tipRef = ref(null)
const pos = ref({ x: 0, y: 0 })

const place = () => {
  if (!props.show || !props.anchor) return
  const el = props.anchor instanceof Element ? props.anchor : props.anchor?.$el || props.anchor
  if (!el || !(el instanceof Element)) return
  const r = el.getBoundingClientRect()
  pos.value = { x: r.left, y: r.bottom + 6 }
}

watch(() => props.show, (v) => { if (v) place() })
watch(() => props.anchor, () => { if (props.show) place() })
</script>

<style>
.tooltip-box {
  position: fixed;
  z-index: 9999;
  padding: 0.5rem 0.75rem;
  background: #1e1e2e;
  border: 1px solid var(--accent);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.68rem;
  line-height: 1.5;
  white-space: pre;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  max-width: 360px;
}
</style>

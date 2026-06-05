<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  items: { type: Array, required: true },
  modelValue: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue'])

const trackRef = ref(null)
const isDragging = ref(false)
const dragPx = ref(0)
let dragStartX = 0
let dragMoved = false

const sliderStyle = computed(() => {
  const t = isDragging.value ? 'none' : 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
  if (isDragging.value) {
    return { transform: `translateX(${-props.modelValue * 100}%) translateX(${dragPx.value}px)`, transition: t }
  }
  return { transform: `translateX(${-props.modelValue * 100}%)`, transition: t }
})

const clientX = (e) => e.touches ? e.touches[0].clientX : e.clientX
const endX   = (e) => e.changedTouches ? e.changedTouches[0].clientX : e.clientX

const emitIndex = (i) => {
  const clamped = Math.max(0, Math.min(i, props.items.length - 1))
  if (clamped !== props.modelValue) {
    emit('update:modelValue', clamped)
  }
}

const onDragStart = (e) => {
  isDragging.value = true
  dragMoved = false
  dragPx.value = 0
  dragStartX = clientX(e)
}

const onDragMove = (e) => {
  if (!isDragging.value) return
  const dx = clientX(e) - dragStartX
  if (Math.abs(dx) > 3) dragMoved = true
  dragPx.value = dx
}

const onDragEnd = (e) => {
  isDragging.value = false
  const dx = endX(e) - dragStartX
  const w = trackRef.value?.clientWidth || 300
  const thresh = w * 0.2
  if (Math.abs(dx) > thresh) {
    emitIndex(props.modelValue + (dx > 0 ? -1 : 1))
  }
  dragPx.value = 0
}

const onCardClick = (i) => {
  if (dragMoved) return
  emitIndex(i)
}
</script>

<template>
  <div
    class="swipe-carousel"
    @mousedown.prevent="onDragStart"
    @mousemove="onDragMove"
    @mouseup="onDragEnd"
    @mouseleave="onDragEnd"
    @touchstart.prevent="onDragStart"
    @touchmove="onDragMove"
    @touchend="onDragEnd"
  >
    <button class="swipe-arrow" @click.stop="emitIndex(modelValue - 1)" :disabled="modelValue <= 0">‹</button>
    <div class="swipe-track" ref="trackRef">
      <div class="swipe-slider" :style="sliderStyle">
        <div
          v-for="(item, i) in items"
          :key="item.name || i"
          class="swipe-card"
          :class="{ active: i === modelValue }"
          @click="onCardClick(i)"
        >
          <span class="swipe-card-name">{{ item.label || item.name }}</span>
          <span class="swipe-card-desc" v-if="item.desc">{{ item.desc }}</span>
        </div>
      </div>
    </div>
    <button class="swipe-arrow" @click.stop="emitIndex(modelValue + 1)" :disabled="modelValue >= items.length - 1">›</button>
  </div>
  <div class="swipe-dots">
    <button
      v-for="(_, i) in items"
      :key="i"
      class="swipe-dot"
      :class="{ active: i === modelValue }"
      @click="emitIndex(i)"
    ></button>
  </div>
</template>

<style scoped>
.swipe-carousel {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  user-select: none;
  -webkit-user-select: none;
  touch-action: pan-y;
}

.swipe-arrow {
  flex-shrink: 0;
  width: 28px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.swipe-arrow:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(59, 130, 246, 0.08);
}
.swipe-arrow:disabled {
  opacity: 0.25;
  cursor: default;
}

.swipe-track {
  flex: 1;
  overflow: hidden;
  border-radius: 8px;
  min-height: 52px;
}

.swipe-slider {
  display: flex;
  height: 100%;
  will-change: transform;
}

.swipe-card {
  flex: 0 0 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-primary);
  cursor: grab;
  transition: border-color 0.25s, background 0.25s;
}
.swipe-card:active {
  cursor: grabbing;
}
.swipe-card.active {
  border-color: var(--accent);
  background: rgba(59, 130, 246, 0.06);
}

.swipe-card-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-primary);
}
.swipe-card.active .swipe-card-name {
  color: var(--accent);
}

.swipe-card-desc {
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
  text-align: center;
  line-height: 1.3;
  max-height: 2.6em;
  overflow: hidden;
}

.swipe-dots {
  display: flex;
  justify-content: center;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.swipe-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: none;
  background: var(--border);
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}
.swipe-dot.active {
  background: var(--accent);
  transform: scale(1.3);
}
.swipe-dot:hover {
  background: var(--text-muted);
}
</style>

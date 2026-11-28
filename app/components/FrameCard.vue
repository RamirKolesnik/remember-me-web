<script setup lang="ts">
import type { WallFrame } from '~/composables/useWall'
import type { TagId } from '~/shared/wall'

const props = defineProps<{ frame: WallFrame }>()
const emit = defineEmits<{ close: []; report: [frame: WallFrame]; filter: [tag: TagId] }>()
const number = computed(() => props.frame.number ? `Heartbeat #${props.frame.number.toLocaleString('en-US')} · ` : '')
</script>

<template>
  <section class="card" :aria-label="`Frame of ${frame.name}`">
    <button type="button" class="card__close btn btn--ghost btn--icon" aria-label="Close" @click="emit('close')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
    <div class="card__top">
      <div class="card__avatar" :style="{ background: frame.color, color: frame.ink }">
        <img v-if="frame.photoUrl" :src="frame.photoUrl" :alt="`Photo of ${frame.name}`">
        <template v-else>{{ frame.initials }}</template>
      </div>
      <div class="card__who">
        <span class="card__name">{{ frame.name }}</span>
        <span class="card__meta">{{ number }}{{ frame.placedAt }}</span>
      </div>
    </div>
    <FrameTags :frame="frame" clickable @filter="emit('filter', $event)" />
    <p class="card__note">{{ frame.note }}</p>
    <div class="card__foot">
      <span>Cell ({{ frame.x }}, {{ frame.y }})</span>
      <button type="button" class="card__report" @click="emit('report', frame)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4h11l-1.5 4L16 12H5" /></svg>
        Report
      </button>
    </div>
  </section>
</template>

<style scoped>
.card {
  position: relative;
  width: 320px;
  max-width: 100%;
  background: var(--panel);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--shadow);
}
.card__close { position: absolute; top: 8px; right: 8px; border: 0; }
.card__top { display: flex; gap: 14px; align-items: center; padding-right: 40px; }
.card__avatar {
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 600;
}
.card__avatar { overflow: hidden; }
.card__avatar img { width: 100%; height: 100%; object-fit: cover; }
.card__who { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.card__name { font-size: 17px; font-weight: 600; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.card__meta { font-size: 12px; color: var(--muted); }
.card__note { margin: 0; font-size: 15px; line-height: 1.5; color: var(--ink-2); overflow-wrap: anywhere; }
.card__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--line-soft);
  padding-top: 8px;
  font-size: 12px;
  color: var(--muted);
}
.card__report {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
}
.card__report:hover { color: var(--danger); }
</style>

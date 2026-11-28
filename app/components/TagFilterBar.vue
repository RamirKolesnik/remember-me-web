<script setup lang="ts">
// The filter bar over the wall: one chip per tag with how many frames have it.
// A tap lights those frames up in yellow; a second tap (or the cross) clears it.
import type { TagId } from '~/shared/wall'
import { FILTER_TAGS, TAG_STYLE } from '~/shared/tags'

const props = defineProps<{
  active: TagId | null
  counts: Record<TagId, number>
}>()
const emit = defineEmits<{ pick: [tag: TagId | null] }>()

const fmt = (n: number) => n.toLocaleString('en-US')
const toggle = (id: TagId) => emit('pick', props.active === id ? null : id)
</script>

<template>
  <nav class="bar" aria-label="Filter the wall by tag">
    <!-- First, so it never scrolls out of sight on a narrow screen. -->
    <button v-if="active" type="button" class="chip chip--clear" aria-label="Clear the filter" @click="emit('pick', null)">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
    <button
      v-for="id in FILTER_TAGS"
      :key="id"
      type="button"
      class="chip"
      :class="{ 'chip--on': active === id, 'chip--none': !counts[id] }"
      :style="{ '--tag': TAG_STYLE[id].color }"
      :aria-pressed="active === id"
      :title="counts[id] ? `Show the ${TAG_STYLE[id].plural.toLowerCase()} on the wall` : `No ${TAG_STYLE[id].plural.toLowerCase()} yet`"
      @click="toggle(id)"
    >
      <span class="chip__icon" aria-hidden="true">{{ TAG_STYLE[id].icon }}</span>
      {{ TAG_STYLE[id].plural }}
      <span class="chip__n">{{ fmt(counts[id] ?? 0) }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bar {
  display: flex;
  gap: 6px;
  padding: 5px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow);
  overflow-x: auto;
  scrollbar-width: none;
}
.bar::-webkit-scrollbar { display: none; }
.chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-2);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.chip:hover { background: var(--line); color: var(--ink); }
.chip:focus-visible { outline: 2px solid var(--spot); outline-offset: 1px; }
.chip__icon { color: var(--tag); font-size: 11px; }
.chip__n {
  min-width: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--line);
  color: var(--muted);
  font-size: 11px;
  text-align: center;
}
.chip--none { opacity: 0.45; }
.chip--on {
  border-color: var(--spot);
  background: color-mix(in srgb, var(--spot) 16%, transparent);
  color: var(--spot);
  opacity: 1;
}
.chip--on .chip__n { background: var(--spot); color: #2A2200; }
.chip--clear { width: 30px; padding: 0; justify-content: center; color: var(--muted); }
@media (prefers-reduced-motion: reduce) {
  .chip { transition: none; }
}
</style>

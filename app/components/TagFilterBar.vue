<script setup lang="ts">
// The filter bar over the wall: one chip per tag with how many frames have it.
// A tap lights those frames up in yellow; a second tap (or the cross) clears it.
// When the chips don't fit, the row scrolls (wheel, trackpad, swipe) and
// arrows inside the bar page through it, like a slider.
import type { TagId } from '~/shared/wall'
import { FILTER_TAGS, TAG_STYLE } from '~/shared/tags'

const props = defineProps<{
  active: TagId | null
  counts: Record<TagId, number>
}>()
const emit = defineEmits<{ pick: [tag: TagId | null] }>()

const fmt = (n: number) => n.toLocaleString('en-US')
const toggle = (id: TagId) => emit('pick', props.active === id ? null : id)

const track = ref<HTMLDivElement | null>(null)
const canLeft = ref(false)
const canRight = ref(false)

function measure() {
  const el = track.value
  if (!el) return
  canLeft.value = el.scrollLeft > 1
  canRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

function page(dir: -1 | 1) {
  const el = track.value
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollBy({ left: dir * Math.max(80, el.clientWidth * 0.7), behavior: reduce ? 'auto' : 'smooth' })
}

// A plain mouse wheel scrolls the row sideways instead of zooming the wall.
function onWheel(e: WheelEvent) {
  const el = track.value
  if (!el || el.scrollWidth <= el.clientWidth) return
  const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
  e.preventDefault()
  e.stopPropagation()
  el.scrollLeft += d
}

let observer: ResizeObserver | null = null
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (track.value) observer.observe(track.value)
})
onBeforeUnmount(() => observer?.disconnect())
// Counts change the chips' widths.
watch(() => props.counts, () => nextTick(measure))

// The chip just switched on comes into view (it may be half hidden at an edge).
watch(() => props.active, (id) => nextTick(() => {
  if (!id) return
  track.value?.querySelector<HTMLElement>(`[data-tag="${id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  measure()
}))
</script>

<template>
  <nav class="bar" aria-label="Filter the wall by tag">
    <!-- Outside the scrolling row, so it is always in reach. -->
    <button v-if="active" type="button" class="chip chip--clear" aria-label="Clear the filter" @click="emit('pick', null)">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
    <div class="row" :class="{ 'row--left': canLeft, 'row--right': canRight }">
      <div ref="track" class="track" @scroll.passive="measure" @wheel="onWheel">
        <button
          v-for="id in FILTER_TAGS"
          :key="id"
          type="button"
          class="chip"
          :data-tag="id"
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
      </div>
      <button v-show="canLeft" type="button" class="arrow arrow--left" tabindex="-1" aria-label="Scroll the tags left" @click="page(-1)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <button v-show="canRight" type="button" class="arrow arrow--right" tabindex="-1" aria-label="Scroll the tags right" @click="page(1)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow);
  min-width: 0;
}
.row {
  position: relative;
  flex: 1;
  min-width: 0;
  border-radius: 999px;
  overflow: hidden;
}
.track {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  /* Chips fade out under the arrows instead of being cut. */
  --fade-l: 0px;
  --fade-r: 0px;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 var(--fade-l), #000 calc(100% - var(--fade-r)), transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 var(--fade-l), #000 calc(100% - var(--fade-r)), transparent 100%);
}
.track::-webkit-scrollbar { display: none; }
.row--left .track { --fade-l: 44px; }
.row--right .track { --fade-r: 44px; }
.chip {
  flex-shrink: 0;
  scroll-snap-align: start;
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
.chip:focus-visible { outline: 2px solid var(--spot); outline-offset: -2px; }
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
.chip--clear { flex-shrink: 0; width: 30px; padding: 0; justify-content: center; color: var(--muted); }
/* Arrows sit inside the bar, over the faded ends of the row. */
.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: var(--paper-2);
  color: var(--ink);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  cursor: pointer;
}
.arrow:hover { background: var(--paper); border-color: var(--spot); color: var(--spot); }
.arrow--left { left: 1px; }
.arrow--right { right: 1px; }
@media (prefers-reduced-motion: reduce) {
  .chip { transition: none; }
}
</style>

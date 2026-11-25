<script setup lang="ts">
import { formatUsd, WALL_SIZE, ZONES } from '~/shared/wall'
import { tierOf } from '~/shared/tiers'
import type { WallView } from '~/components/WallCanvas.vue'

const props = defineProps<{ view: WallView | null }>()
const emit = defineEmits<{ jump: [cell: { x: number; y: number }] }>()

const { pricing } = usePricing()
const isClosed = (id: number) => !!pricing.value && !pricing.value.zones[id - 1]!.open
const legendPrice = (id: number) => {
  const z = pricing.value?.zones[id - 1]
  if (!z) return ''
  return z.open ? formatUsd(z.priceCents) : 'soon'
}

const SIZE = 160
const k = SIZE / WALL_SIZE

const viewBox = computed(() => {
  const v = props.view
  if (!v) return null
  const w = Math.max(v.w * k, 3), h = Math.max(v.h * k, 3)
  return {
    left: `${(v.cx * k - w / 2)}px`,
    top: `${(v.cy * k - h / 2)}px`,
    width: `${w}px`,
    height: `${h}px`,
  }
})

function onClick(e: MouseEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  emit('jump', { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k })
}
</script>

<template>
  <div class="mini">
    <button type="button" class="mini__map" aria-label="Minimap: click to jump there" @click="onClick">
      <span
        v-for="z in [...ZONES].reverse()"
        :key="z.id"
        class="mini__zone"
        :class="{ 'mini__zone--closed': isClosed(z.id) }"
        :style="{ left: `${z.min * k}px`, top: `${z.min * k}px`, width: `${(z.max - z.min + 1) * k}px`, height: `${(z.max - z.min + 1) * k}px`, background: tierOf(z.id).map }"
      />
      <span class="mini__heart" />
      <span v-if="viewBox" class="mini__view" :style="viewBox" />
    </button>
    <div class="mini__legend">
      <span v-for="z in ZONES" :key="z.id"><i :style="{ background: tierOf(z.id).accent }" />{{ tierOf(z.id).name }} {{ legendPrice(z.id) }}</span>
    </div>
  </div>
</template>

<style scoped>
.mini {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 10px;
}
.mini__map {
  position: relative;
  width: 160px;
  height: 160px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  background: #0E080B;
}
.mini__zone { position: absolute; border-radius: 2px; }
/* Not on sale yet: washed out and hatched, like on the wall. */
.mini__zone--closed {
  background-image: repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0 1px, transparent 1px 4px) !important;
  background-color: #120C0F !important;
}
.mini__heart { position: absolute; left: 78px; top: 78px; width: 4px; height: 4px; border-radius: 1px; background: var(--heart); box-shadow: 0 0 6px var(--heart); }
.mini__view { position: absolute; border: 1.5px solid #fff; border-radius: 1px; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4); }
.mini__legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 8px;
  font-size: 11px;
  color: var(--ink-2);
}
.mini__legend span { display: flex; align-items: center; gap: 5px; }
.mini__legend i { width: 8px; height: 8px; border-radius: 2px; border: 1px solid rgba(255, 255, 255, 0.12); }
</style>

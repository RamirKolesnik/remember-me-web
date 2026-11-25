<script setup lang="ts">
import { formatUsd, WALL_SIZE, ZONES } from '~/shared/wall'
import { tierOf } from '~/shared/tiers'
import type { WallView } from '~/components/WallCanvas.vue'

const props = defineProps<{ view: WallView | null }>()
const emit = defineEmits<{ jump: [cell: { x: number; y: number }] }>()

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
        :style="{ left: `${z.min * k}px`, top: `${z.min * k}px`, width: `${(z.max - z.min + 1) * k}px`, height: `${(z.max - z.min + 1) * k}px`, background: tierOf(z.id).map }"
      />
      <span class="mini__heart" />
      <span v-if="viewBox" class="mini__view" :style="viewBox" />
    </button>
    <div class="mini__legend">
      <span v-for="z in ZONES" :key="z.id"><i :style="{ background: tierOf(z.id).accent }" />{{ tierOf(z.id).name }} {{ formatUsd(z.priceCents) }}</span>
    </div>
  </div>
</template>

<style scoped>
.mini {
  width: 184px;
  padding: 12px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 12px;
  display: flex;
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
  background: var(--line-soft);
}
.mini__zone { position: absolute; border-radius: 2px; }
.mini__heart { position: absolute; left: 79px; top: 79px; width: 3px; height: 3px; background: var(--heart); }
.mini__view { position: absolute; border: 1.5px solid var(--ink); border-radius: 1px; }
.mini__legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 8px;
  font-size: 11px;
  color: var(--ink-2);
}
.mini__legend span { display: flex; align-items: center; gap: 5px; }
.mini__legend i { width: 8px; height: 8px; border-radius: 2px; border: 1px solid rgba(24, 23, 28, 0.1); }
</style>

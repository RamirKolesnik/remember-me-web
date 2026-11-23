<script setup lang="ts">
import { formatShare, wallFill } from '~/shared/stats'

const { frames } = useWall()

// Same swatches as the minimap legend.
const swatches: Record<number, string> = { 1: '#AFA9EC', 2: '#CECBF6', 3: '#EEEDFE', 4: '#F1EFE8' }

const fill = computed(() => wallFill(frames.value))
const fmt = (n: number) => n.toLocaleString('en-US')
// A started bar never looks empty: anything taken gets at least a sliver.
const width = (taken: number, total: number) => (taken > 0 ? `max(3px, ${(taken / total) * 100}%)` : '0')
</script>

<template>
  <section class="stats" aria-label="How full the wall is">
    <div class="stats__total">
      <div class="stats__row">
        <span class="stats__title">Wall filled</span>
        <b class="stats__share">{{ formatShare(fill.taken, fill.total) }}</b>
      </div>
      <div
        class="stats__bar stats__bar--total"
        role="progressbar"
        aria-label="Whole wall"
        :aria-valuenow="fill.taken"
        aria-valuemin="0"
        :aria-valuemax="fill.total"
        :aria-valuetext="`${fmt(fill.taken)} of ${fmt(fill.total)} cells taken`"
      >
        <i :style="{ width: width(fill.taken, fill.total) }" />
      </div>
      <p class="stats__note">
        <span>{{ fmt(frames.length) }} frames</span>
        <span>{{ fmt(fill.total - fill.taken) }} left</span>
      </p>
    </div>

    <ul class="stats__zones">
      <li v-for="z in fill.zones" :key="z.zone.id">
        <div class="stats__row">
          <span class="stats__zone"><i :style="{ background: swatches[z.zone.id] }" />Zone {{ z.zone.id }} ×{{ z.zone.multiplier }}</span>
          <span class="stats__pct">{{ formatShare(z.taken, z.total) }}</span>
        </div>
        <div
          class="stats__bar"
          role="progressbar"
          :aria-label="`Zone ${z.zone.id}`"
          :aria-valuenow="z.taken"
          aria-valuemin="0"
          :aria-valuemax="z.total"
          :aria-valuetext="`${fmt(z.taken)} of ${fmt(z.total)} cells taken`"
        >
          <i :style="{ width: width(z.taken, z.total) }" />
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.stats {
  width: 184px;
  padding: 12px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.stats__total { display: flex; flex-direction: column; gap: 6px; }
.stats__row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.stats__title { font-size: 13px; font-weight: 600; color: var(--ink); }
.stats__share { font-family: var(--font-display); font-size: 18px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
.stats__note {
  margin: 0;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.stats__bar {
  height: 4px;
  border-radius: 999px;
  background: var(--line-soft);
  overflow: hidden;
}
.stats__bar i { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
.stats__bar--total { height: 8px; }
.stats__bar--total i { background: var(--ink); }
.stats__zones {
  margin: 0;
  padding: 12px 0 0;
  border-top: 1px solid var(--line-soft);
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stats__zones li { display: flex; flex-direction: column; gap: 4px; }
.stats__zone { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--ink-2); }
.stats__zone i { width: 8px; height: 8px; border-radius: 2px; border: 1px solid rgba(24, 23, 28, 0.1); }
.stats__pct { font-size: 11px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
</style>

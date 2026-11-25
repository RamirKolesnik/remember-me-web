<script setup lang="ts">
import { formatShare, wallFill } from '~/shared/stats'
import { formatUsd } from '~/shared/wall'
import { tierOf } from '~/shared/tiers'
import { nextStepText, unlockText } from '~/shared/news'
import { heartbeatLabel, purchasesLastHour } from '~/shared/heartbeat'

// Hovering a zone lights it on the wall; a click (or tap) zooms to it.
const emit = defineEmits<{ highlight: [zoneId: number | null]; fit: [zoneId: number] }>()

const { frames } = useWall()
const { pricing } = usePricing()

const fill = computed(() => wallFill(frames.value))
// The heart's pace, here too: its own label on the wall shows only on hover.
const clock = ref(Date.now())
let tick: ReturnType<typeof setInterval> | null = null
onMounted(() => { tick = setInterval(() => { clock.value = Date.now() }, 60_000) })
onBeforeUnmount(() => { if (tick) clearInterval(tick) })
const pulse = computed(() => heartbeatLabel(purchasesLastHour(frames.value, clock.value)))
const fmt = (n: number) => n.toLocaleString('en-US')
// A started bar never looks empty: anything taken gets at least a sliver.
const width = (taken: number, total: number) => (taken > 0 ? `max(3px, ${(taken / total) * 100}%)` : '0')
/** How full step i is: steps before the current one are full, later ones empty. */
function stepFill(sold: number, capacity: number, i: number, steps: number) {
  const per = capacity / steps
  const done = Math.min(Math.max(sold - i * per, 0), per)
  if (done <= 0) return '0'
  return `max(2px, ${(done / per) * 100}%)`
}
/** Under a tenth of a step left at this price: say it louder. */
const isHot = (left: number, capacity: number) => left > 0 && left <= capacity / 50
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
      <p class="stats__pulse">
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4h2c.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="currentColor" /></svg>
        {{ pulse }}
      </p>
    </div>

    <ul v-if="pricing" class="stats__zones" aria-label="Prices by zone">
      <li
        v-for="z in pricing.zones"
        :key="z.zone.id"
        class="stats__item"
        :class="{ 'stats__closed': !z.open }"
        tabindex="0"
        :aria-label="`${tierOf(z.zone.id).name}: show on the wall`"
        @mouseenter="emit('highlight', z.zone.id)"
        @mouseleave="emit('highlight', null)"
        @focus="emit('highlight', z.zone.id)"
        @blur="emit('highlight', null)"
        @click="emit('fit', z.zone.id)"
        @keydown.enter.prevent="emit('fit', z.zone.id)"
      >
        <div class="stats__row">
          <span class="stats__zone"><i :style="{ background: tierOf(z.zone.id).accent }" />{{ tierOf(z.zone.id).name }}</span>
          <b v-if="z.open" class="stats__price">{{ formatUsd(z.priceCents) }}</b>
          <span v-else class="stats__lock">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            Wave {{ z.zone.wave }}
          </span>
        </div>
        <!-- Five price steps; the filled part is how much of the zone is sold. -->
        <div
          v-if="z.open"
          class="stats__steps"
          role="progressbar"
          :aria-label="`${tierOf(z.zone.id).name} sold`"
          :aria-valuenow="z.sold"
          aria-valuemin="0"
          :aria-valuemax="z.zone.capacity"
          :aria-valuetext="`${formatShare(z.sold, z.zone.capacity)} sold, price step ${z.step + 1} of ${z.zone.stepsCents.length}`"
        >
          <span
            v-for="(_, i) in z.zone.stepsCents"
            :key="i"
            class="stats__step"
            :class="{ 'stats__step--now': i === z.step }"
          >
            <i :style="{ width: stepFill(z.sold, z.zone.capacity, i, z.zone.stepsCents.length), background: tierOf(z.zone.id).accent }" />
          </span>
        </div>
        <span class="stats__next" :class="{ 'stats__next--hot': z.open && isHot(z.leftAtPrice, z.zone.capacity) }">
          {{ z.open ? nextStepText(z) : unlockText(pricing, z.zone.wave) }}
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.stats {
  width: 200px;
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
.stats__bar--total i { background: var(--heart); box-shadow: 0 0 8px var(--heart); }
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
.stats__item { margin: 0 -6px; padding: 4px 6px; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
.stats__item:hover, .stats__item:focus-visible { background: var(--line-soft); outline: none; }
.stats__pulse { margin: 2px 0 0; display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--accent-ink); }
.stats__pulse svg { color: var(--heart); flex: none; }
.stats__price { font-size: 12px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
.stats__lock { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; color: var(--muted); }
.stats__steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; }
.stats__step { height: 4px; border-radius: 999px; background: var(--line-soft); overflow: hidden; }
.stats__step--now { outline: 1px solid rgba(255, 255, 255, 0.35); outline-offset: 0; }
.stats__step i { display: block; height: 100%; }
.stats__next { font-size: 10px; line-height: 1.35; color: var(--muted); }
.stats__next--hot { color: var(--heart); font-weight: 600; }
.stats__closed .stats__zone { opacity: 0.6; }
.stats__zone { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--ink-2); }
.stats__zone i { width: 8px; height: 8px; border-radius: 2px; border: 1px solid rgba(255, 255, 255, 0.12); }
.stats__pct { font-size: 11px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
</style>

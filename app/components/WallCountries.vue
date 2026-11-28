<script setup lang="ts">
import { countryTable } from '~/shared/countries'
import { formatShare } from '~/shared/stats'

// Where the wall's people come from: the top countries by share of frames.
// On a desktop the panel folds to one line (remembered); in a phone sheet it
// is always open.
const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

const { stats } = useCountries()
const SHORT = 5
const LONG = 10
const all = ref(false)
const table = computed(() => (stats.value ? countryTable(stats.value, all.value ? LONG : SHORT) : null))
const canMore = computed(() => !!stats.value && stats.value.countries.length > SHORT)
const fmt = (n: number) => n.toLocaleString('en-US')
const pct = (share: number, known: number) => formatShare(Math.round(share * known), known)
// The bar is relative to the leader, so the top row is always full.
const barOf = (count: number) => {
  const lead = table.value?.top[0]?.count ?? 0
  return lead > 0 ? `max(3px, ${(count / lead) * 100}%)` : '0'
}

const STORAGE_KEY = 'rm.countries.collapsed'
const collapsed = ref(false)
onMounted(() => {
  if (props.embedded) return
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    // Short screens start folded: the right column is already tall.
    collapsed.value = saved === null ? window.innerHeight < 880 : saved === '1'
  } catch { /* private mode */ }
})
function toggle() {
  collapsed.value = !collapsed.value
  try { localStorage.setItem(STORAGE_KEY, collapsed.value ? '1' : '0') } catch { /* private mode */ }
}
const open = computed(() => props.embedded || !collapsed.value)
</script>

<template>
  <section class="cty" :class="{ 'cty--embedded': embedded }" aria-label="Where people come from">
    <button
      v-if="!embedded"
      type="button"
      class="cty__head"
      :aria-expanded="open"
      aria-controls="countries-list"
      @click="toggle"
    >
      <svg class="cty__globe" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" /></svg>
      <span class="cty__title">Countries</span>
      <span v-if="!open && table?.top.length" class="cty__flags" aria-hidden="true">
        <span v-for="r in table.top.slice(0, 3)" :key="r.code" class="fi cty__flag" :class="`fi-${r.code.toLowerCase()}`" />
      </span>
      <b v-if="table" class="cty__count">{{ fmt(table.countryCount) }}</b>
      <svg class="cty__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </button>

    <div v-show="open" id="countries-list" class="cty__body">
      <p v-if="!table" class="cty__empty">Counting…</p>
      <p v-else-if="!table.known" class="cty__empty">No countries yet. <NuxtLink to="/immortalize">Put yours first.</NuxtLink></p>
      <template v-else>
        <p class="cty__sum">
          {{ fmt(table.known) }} {{ table.known === 1 ? 'person' : 'people' }} from {{ fmt(table.countryCount) }} {{ table.countryCount === 1 ? 'country' : 'countries' }}
        </p>
        <ol class="cty__list">
          <li v-for="(r, i) in table.top" :key="r.code" class="cty__row" :title="`${r.name}: ${fmt(r.count)} ${r.count === 1 ? 'frame' : 'frames'}`">
            <span class="cty__rank">{{ i + 1 }}</span>
            <span class="fi cty__flag" :class="`fi-${r.code.toLowerCase()}`" aria-hidden="true" />
            <span class="cty__name">{{ r.name }}</span>
            <b class="cty__pct">{{ pct(r.share, table.known) }}</b>
            <span class="cty__bar" aria-hidden="true"><i :style="{ width: barOf(r.count) }" :class="{ 'cty__bar--lead': i === 0 }" /></span>
          </li>
        </ol>
        <p v-if="table.rest" class="cty__rest">
          <span>+{{ fmt(table.rest.countries) }} more {{ table.rest.countries === 1 ? 'country' : 'countries' }}</span>
          <b>{{ pct(table.rest.share, table.known) }}</b>
        </p>
        <button v-if="canMore" type="button" class="cty__more" @click="all = !all">
          {{ all ? `Show top ${SHORT}` : `Show top ${LONG}` }}
        </button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.cty { width: 200px; display: flex; flex-direction: column; }
.cty--embedded { width: auto; }
.cty__head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  cursor: pointer;
  text-align: left;
}
.cty__globe { color: var(--accent-ink); flex: none; }
.cty__title { font-size: 13px; font-weight: 600; }
.cty__flags { display: inline-flex; gap: 3px; margin-left: 2px; }
.cty__count {
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--line-soft);
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}
.cty__chev { color: var(--muted); flex: none; transition: transform 0.2s; transform: rotate(180deg); }
.cty__head[aria-expanded='false'] .cty__chev { transform: none; }
.cty__body { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
.cty--embedded .cty__body { padding-top: 0; }
.cty__sum, .cty__empty { margin: 0; font-size: 11px; color: var(--muted); }
.cty__empty a { color: var(--accent-ink); }
.cty__list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 7px; }
.cty__row {
  display: grid;
  grid-template-columns: 12px 18px 1fr auto;
  grid-template-rows: auto 3px;
  align-items: center;
  column-gap: 6px;
  row-gap: 3px;
}
.cty__rank { font-size: 10px; color: var(--muted); text-align: right; font-variant-numeric: tabular-nums; }
/* flag-icons draws a 4:3 flag as a background image. */
.cty__flag {
  width: 18px;
  height: 13.5px;
  line-height: 1;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12);
  flex: none;
}
.cty__flags .cty__flag { width: 16px; height: 12px; }
.cty__name { font-size: 12px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cty__pct { font-size: 12px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
.cty__bar { grid-column: 3 / 5; height: 3px; border-radius: 999px; background: var(--line-soft); overflow: hidden; }
.cty__bar i { display: block; height: 100%; border-radius: inherit; background: var(--accent-ink); opacity: 0.7; }
.cty__bar i.cty__bar--lead { background: var(--heart); opacity: 1; box-shadow: 0 0 6px var(--heart); }
.cty__rest {
  margin: 0;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--line-soft);
  font-size: 11px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.cty__rest b { color: var(--ink-2); font-weight: 600; }
.cty__more {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--accent-ink);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.cty__more:hover { text-decoration: underline; }
@media (prefers-reduced-motion: reduce) {
  .cty__chev { transition: none; }
}
</style>

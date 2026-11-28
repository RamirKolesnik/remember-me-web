<script setup lang="ts">
import { countryPlace, countryTable, ordinal, searchCountries } from '~/shared/countries'
import { formatShare } from '~/shared/stats'

// Where the wall's people come from: the top countries by share of frames.
// On a desktop the panel folds to one line (remembered); in a phone sheet it
// is always open.
// A country picked here (from the search, the top or the own-country plaque)
// lights its frames on the wall in yellow, like the tag filter; `active` is
// the country lit now. Picking it again turns the light off.
const props = withDefaults(defineProps<{ embedded?: boolean; active?: string | null }>(), { embedded: false, active: null })
const emit = defineEmits<{ filter: [code: string | null] }>()

const { stats, mine } = useCountries()
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

// Search: type a country, pick it, see where it stands even outside the top.
// Until something is picked, the visitor's own country is shown.
const query = ref('')
const cursor = ref(0)
const picked = ref<string | null>(null)
const input = ref<HTMLInputElement | null>(null)
const hits = computed(() => searchCountries(query.value, 5))
watch(query, () => { cursor.value = 0 })
const placeOf = (code: string) => (stats.value ? countryPlace(stats.value, code) : null)
const shown = computed(() => picked.value ?? mine.value)
const place = computed(() => (shown.value ? placeOf(shown.value) : null))
const isMine = computed(() => !!shown.value && shown.value === mine.value)
/** Shows a country in the plaque and lights it on the wall (if anyone is there). */
function pick(code: string) {
  picked.value = code
  query.value = ''
  input.value?.blur()
  if ((placeOf(code)?.count ?? 0) > 0) emit('filter', code)
  else if (props.active) emit('filter', null)
}
/** A row of the top or the plaque: on, or off when already lit. */
function toggleCountry(code: string) {
  if (props.active === code) emit('filter', null)
  else pick(code)
}
function clearPick() {
  if (props.active && props.active === picked.value) emit('filter', null)
  picked.value = null
  query.value = ''
}
function onKey(e: KeyboardEvent) {
  const n = hits.value.length
  if (e.key === 'ArrowDown' && n) { e.preventDefault(); cursor.value = (cursor.value + 1) % n }
  else if (e.key === 'ArrowUp' && n) { e.preventDefault(); cursor.value = (cursor.value - 1 + n) % n }
  else if (e.key === 'Enter' && n) { e.preventDefault(); pick(hits.value[cursor.value]!) }
  else if (e.key === 'Escape') { e.stopPropagation(); if (query.value) query.value = ''; else input.value?.blur() }
}
const hitText = (code: string) => {
  const p = placeOf(code)
  return p?.rank ? `${ordinal(p.rank)} · ${pct(p.share, table.value?.known ?? 0)}` : 'No one yet'
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
        <div class="cty__search" role="combobox" :aria-expanded="!!query && hits.length > 0" aria-haspopup="listbox" aria-owns="countries-hits">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input
            ref="input"
            v-model="query"
            type="search"
            class="cty__input"
            placeholder="Find your country"
            aria-label="Find a country"
            aria-autocomplete="list"
            aria-controls="countries-hits"
            :aria-activedescendant="query && hits.length ? `cty-hit-${hits[cursor]}` : undefined"
            autocomplete="off"
            spellcheck="false"
            @keydown="onKey"
          >
          <button v-if="query" type="button" class="cty__x" aria-label="Clear search" @click="query = ''; input?.focus()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <template v-if="query">
          <ul v-if="hits.length" id="countries-hits" class="cty__hits" role="listbox" aria-label="Countries found">
            <li
              v-for="(code, i) in hits"
              :id="`cty-hit-${code}`"
              :key="code"
              role="option"
              :aria-selected="i === cursor"
              class="cty__hit"
              :class="{ 'cty__hit--active': i === cursor }"
              @mousedown.prevent="pick(code)"
              @mouseenter="cursor = i"
            >
              <span class="fi cty__flag" :class="`fi-${code.toLowerCase()}`" aria-hidden="true" />
              <span class="cty__name">{{ placeOf(code)?.name }}</span>
              <span class="cty__hitmeta" :class="{ 'cty__hitmeta--none': !placeOf(code)?.rank }">{{ hitText(code) }}</span>
            </li>
          </ul>
          <p v-else class="cty__empty">No country called “{{ query.trim() }}”.</p>
        </template>

        <div v-else-if="place" class="cty__me" :class="{ 'cty__me--none': !place.rank, 'cty__me--lit': active === place.code }" role="status">
          <span class="fi cty__flag cty__flag--big" :class="`fi-${place.code.toLowerCase()}`" aria-hidden="true" />
          <span class="cty__me-text">
            <span class="cty__me-label">{{ isMine ? 'Your country' : place.name }}</span>
            <template v-if="place.rank">
              <b class="cty__me-main">{{ isMine ? `${place.name} is ${ordinal(place.rank)}` : `${ordinal(place.rank)} of ${fmt(place.of)}` }}</b>
              <span class="cty__me-sub">{{ fmt(place.count) }} {{ place.count === 1 ? 'person' : 'people' }} · {{ pct(place.share, table.known) }}</span>
              <button
                type="button"
                class="cty__light"
                :class="{ 'cty__light--on': active === place.code }"
                :aria-pressed="active === place.code"
                @click="toggleCountry(place.code)"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path v-if="active === place.code" d="M6 6l12 12M18 6L6 18" />
                  <template v-else><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></template>
                </svg>
                {{ active === place.code ? 'Lit on the wall · Clear' : 'Light up on the wall' }}
              </button>
            </template>
            <template v-else>
              <b class="cty__me-main">{{ isMine ? `No one from ${place.name} yet` : 'No one here yet' }}</b>
              <NuxtLink to="/immortalize" class="cty__me-cta">Be the first →</NuxtLink>
            </template>
          </span>
          <button v-if="picked" type="button" class="cty__x" aria-label="Back to your country" @click="clearPick">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <ol v-show="!query" class="cty__list">
          <li v-for="(r, i) in table.top" :key="r.code">
            <button
              type="button"
              class="cty__row"
              :class="{ 'cty__row--me': r.code === shown, 'cty__row--lit': r.code === active }"
              :aria-pressed="r.code === active"
              :title="`${r.name}: ${fmt(r.count)} ${r.count === 1 ? 'frame' : 'frames'}. ${r.code === active ? 'Click to clear' : 'Click to light them up'}`"
              @click="toggleCountry(r.code)"
            >
              <span class="cty__rank">{{ i + 1 }}</span>
              <span class="fi cty__flag" :class="`fi-${r.code.toLowerCase()}`" aria-hidden="true" />
              <span class="cty__name">{{ r.name }}</span>
              <b class="cty__pct">{{ pct(r.share, table.known) }}</b>
              <span class="cty__bar" aria-hidden="true"><i :style="{ width: barOf(r.count) }" :class="{ 'cty__bar--lead': i === 0 }" /></span>
            </button>
          </li>
        </ol>
        <p v-if="table.rest && !query" class="cty__rest">
          <span>+{{ fmt(table.rest.countries) }} more {{ table.rest.countries === 1 ? 'country' : 'countries' }}</span>
          <b>{{ pct(table.rest.share, table.known) }}</b>
        </p>
        <button v-if="canMore && !query" type="button" class="cty__more" @click="all = !all">
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
.cty__list { margin-left: -6px; margin-right: -6px; gap: 2px; }
.cty__row {
  width: 100%;
  padding: 4px 6px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
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
/* Country search */
.cty__search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 6px 0 9px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  transition: border-color 0.15s;
}
.cty__search:focus-within { border-color: var(--accent-ink); color: var(--ink-2); }
.cty__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 12px;
}
.cty__input::placeholder { color: var(--muted); }
.cty__input::-webkit-search-cancel-button { display: none; }
.cty__x {
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.cty__x:hover { background: var(--line-soft); color: var(--ink); }
.cty__hits { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 2px; }
.cty__hit {
  display: grid;
  grid-template-columns: 18px 1fr auto;
  align-items: center;
  gap: 6px;
  margin: 0 -6px;
  padding: 5px 6px;
  border-radius: 6px;
  cursor: pointer;
}
.cty__hit--active { background: var(--line-soft); }
.cty__hitmeta { font-size: 11px; font-weight: 600; color: var(--ink-2); font-variant-numeric: tabular-nums; white-space: nowrap; }
.cty__hitmeta--none { font-weight: 400; color: var(--muted); }
/* The picked (or own) country: where it stands, even outside the top. */
.cty__me {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 9px;
  padding: 8px 8px 8px 9px;
  border-radius: 9px;
  background: var(--accent-soft);
  border: 1px solid rgba(255, 59, 92, 0.28);
}
.cty__me--none { background: var(--line-soft); border-color: var(--line); }
.cty__flag.cty__flag--big { width: 26px; height: 19.5px; border-radius: 3px; }
.cty__me-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.cty__me-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cty__me-main { font-size: 12px; font-weight: 600; color: var(--ink); overflow-wrap: anywhere; }
.cty__me-sub { font-size: 11px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
.cty__me-cta { font-size: 11px; font-weight: 600; color: var(--accent-ink); text-decoration: none; }
.cty__me-cta:hover { text-decoration: underline; }
.cty__row--me .cty__name { color: var(--ink); font-weight: 600; }
.cty__row--me .cty__rank { color: var(--accent-ink); }
.cty__row:hover, .cty__row:focus-visible { background: var(--line-soft); outline: none; }
/* Lit on the wall: the same yellow as the frames it lights. */
.cty__row--lit, .cty__row--lit:hover { background: rgba(255, 225, 77, 0.1); box-shadow: inset 0 0 0 1px rgba(255, 225, 77, 0.55); }
.cty__row--lit .cty__name { color: var(--spot); font-weight: 600; }
.cty__row--lit .cty__bar i { background: var(--spot); box-shadow: 0 0 6px var(--spot); opacity: 1; }
.cty__me--lit { background: rgba(255, 225, 77, 0.1); border-color: rgba(255, 225, 77, 0.6); }
.cty__light {
  align-self: flex-start;
  margin-top: 5px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: transparent;
  color: var(--ink-2);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.cty__light:hover { border-color: var(--spot); color: var(--spot); }
.cty__light--on { border-color: var(--spot); background: var(--spot); color: #2A2206; }
.cty__light--on:hover { color: #2A2206; filter: brightness(1.05); }
@media (max-width: 720px) {
  .cty__row { padding: 8px 6px; }
  .cty__light { padding: 7px 12px; font-size: 12px; }
  .cty__input { font-size: 16px; } /* no zoom-in on focus on iOS */
  .cty__search { height: 40px; }
  .cty__hit { padding: 9px 6px; }
}
@media (prefers-reduced-motion: reduce) {
  .cty__search, .cty__row { transition: none; }
  .cty__chev { transition: none; }
}
</style>

<script setup lang="ts">
import { HEART, ZONES } from '~/shared/wall'
import { fromApi, type ApiFrame, type WallFrame } from '~/composables/useWall'
import type { ClosedZone, WallView } from '~/components/WallCanvas.vue'
import { unlockText } from '~/shared/news'
import { tierOf } from '~/shared/tiers'
import { readMine } from '~/shared/mine'
import { boundsOf, filterColor, filterLabel, matchesFilter, type WallFilter } from '~/shared/tags'

const { frames, frameAt, status, load, byId, byNumber } = useWall()
const api = useApi()
const route = useRoute()
const wall = ref<{
  zoomBy: (f: number) => void
  centerOn: (x: number, y: number, s?: number) => void
  fitZone: (id: number) => void
  fitBox: (x0: number, y0: number, x1: number, y1: number) => void
} | null>(null)
const selected = ref<WallFrame | null>(null)
const view = ref<WallView | null>(null)
const reported = ref<string | null>(null)
const heartOpen = ref(false)
// Frames this visitor bought, remembered in the browser, and the one they
// just bought (back from the payment: /?n=…&mine=1).
const mine = ref<number[]>([])
const celebrate = ref<number | null>(null)
const notice = ref<string | null>(null)

// Widgets: on phones they fold into icons, one open at a time.
const openWidget = useState<string | null>('wall-widget', () => null)
const mobile = useMobile()
const feedBadge = ref(0)
watch(openWidget, (id) => { if (id === 'feed') feedBadge.value = 0 })
function onArrived(n: number) {
  if (mobile.value && openWidget.value !== 'feed') feedBadge.value += n
}

// A zone hovered in the stats panel lights up on the wall; a click zooms to it.
const highlightZone = ref<number | null>(null)
let highlightTimer: ReturnType<typeof setTimeout> | null = null
function fitZone(id: number) {
  wall.value?.fitZone(id)
  if (mobile.value) {
    // No hover on a phone: close the sheet and keep the zone lit for a moment.
    openWidget.value = null
    highlightZone.value = id
    if (highlightTimer) clearTimeout(highlightTimer)
    highlightTimer = setTimeout(() => { highlightZone.value = null }, 4000)
  }
}
const heartActive = computed(() => heartOpen.value || (!!selected.value && selected.value.x === HEART.x && selected.value.y === HEART.y))

const { pricing, milestones } = usePricing()

// The filter: a tap on a tag (Founder, a zone...) lights up every frame like it.
const filter = ref<WallFilter | null>(null)
const filtered = computed(() => {
  const fl = filter.value
  return fl ? frames.value.filter((f) => matchesFilter(f, fl, milestones.value)) : []
})
const spotlight = computed(() => filter.value
  ? { ids: new Set(filtered.value.map((f) => f.id)), color: filterColor(filter.value) }
  : null)
function applyFilter(fl: WallFilter) {
  filter.value = fl
  onSelect(null)
  if (fl.kind === 'zone') {
    wall.value?.fitZone(fl.id)
    return
  }
  const b = boundsOf(filtered.value)
  if (b) wall.value?.fitBox(b.x0, b.y0, b.x1, b.y1)
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && filter.value && !selected.value) filter.value = null
}
const closed = computed<ClosedZone[]>(() => {
  const p = pricing.value
  // Until prices arrive, the rings of later waves are shown closed, so the
  // wall does not look open to the edge for a moment.
  if (!p) return ZONES.filter((z) => z.wave > 1).map((z) => ({
    id: z.id,
    title: `${tierOf(z.id).name} · opens in wave ${z.wave}`,
    detail: '',
  }))
  return p.zones.filter((z) => !z.open).map((z) => ({
    id: z.zone.id,
    title: `${tierOf(z.zone.id).name} · opens in wave ${z.zone.wave}`,
    detail: unlockText(p, z.zone.wave),
  }))
})

// Zone tints and borders: hidden by default, the visitor's choice is remembered.
const ZONES_KEY = 'rm.wall.zones'
const showZones = ref(false)
function toggleZones() {
  showZones.value = !showZones.value
  try { localStorage.setItem(ZONES_KEY, showZones.value ? '1' : '0') } catch { /* private mode */ }
}

onMounted(() => {
  try { showZones.value = localStorage.getItem(ZONES_KEY) === '1' } catch { /* private mode */ }
  mine.value = readMine()
  // A frame bought in another tab of this browser becomes "You" here too.
  window.addEventListener('storage', onStorage)
  window.addEventListener('keydown', onKey)
  load()
})

function show(f: WallFrame) {
  wall.value?.centerOn(f.x + f.size / 2, f.y + f.size / 2, 48)
  onSelect(f)
}

/**
 * Opens frame #n. The wall loaded at page open may not have it yet (bought
 * since), so the API is asked too. False when there is no such frame.
 */
async function goToNumber(n: number): Promise<boolean> {
  let f = byNumber(n)
  if (!f && api.live) {
    try {
      f = fromApi(await api.get<ApiFrame>(`/frames/by-number/${n}`))
    } catch {
      f = null
    }
  }
  if (!f) return false
  show(f)
  if (route.query.mine === '1') celebrateFrame(f)
  return true
}

function onStorage(e: StorageEvent) {
  if (e.key === 'rm.mine') mine.value = [...new Set([...mine.value, ...readMine()])]
}
onBeforeUnmount(() => {
  window.removeEventListener('storage', onStorage)
  window.removeEventListener('keydown', onKey)
})

function celebrateFrame(f: WallFrame) {
  celebrate.value = f.id
  if (!mine.value.includes(f.id)) mine.value = [...mine.value, f.id]
  notice.value = 'This is you. The gold rings are your heartbeat; the red ones come from the heart of the wall.'
}

// /?n=4812 (from /f/4812) and /?frame=123 open the wall on that frame. The
// query is watched: on a direct load it only appears after hydration.
watch([status, wall, () => route.query.n, () => route.query.frame], ([s, w, n, id]) => {
  if (s !== 'ready' || !w) return
  if (Number(n) > 0) {
    goToNumber(Number(n))
    return
  }
  const f = Number(id) > 0 ? byId(Number(id)) : null
  if (f) {
    show(f)
    if (route.query.mine === '1') celebrateFrame(f)
  }
}, { immediate: true })

function onSelect(frame: WallFrame | null) {
  selected.value = frame
  if (frame) openWidget.value = null
  heartOpen.value = false
  reported.value = null
  if (frame?.id !== celebrate.value) notice.value = null
}

async function onReport(frame: WallFrame) {
  if (api.live) {
    try {
      await api.post(`/frames/${frame.id}/reports`, {})
    } catch {
      reported.value = "Couldn't send the report. Try again later."
      return
    }
  }
  reported.value = `Thanks — the frame of ${frame.name} will be reviewed.`
}
</script>

<template>
  <div class="page">
    <SiteHeader />
    <PriceStrip />
    <main class="stage">
      <ClientOnly>
        <WallCanvas
          ref="wall"
          :frames="frames"
          :frame-at="frameAt"
          :selected-id="selected?.id ?? null"
          :show-zones="showZones"
          :closed="closed"
          :mine="mine"
          :celebrate="celebrate"
          :heart-active="heartActive"
          :highlight-zone="highlightZone ?? (filter?.kind === 'zone' ? filter.id : null)"
          :spotlight="spotlight"
          @select="onSelect"
          @heart="onSelect(null); heartOpen = true; openWidget = null"
          @view="view = $event"
        />
      </ClientOnly>

      <WallStatus />

      <div v-if="filter" class="filter" role="status" :style="{ '--tag': filterColor(filter) }">
        <i aria-hidden="true" />
        <span><b>{{ filterLabel(filter) }}</b> · {{ filtered.length.toLocaleString('en-US') }} on the wall</span>
        <button type="button" class="filter__clear" aria-label="Show all frames" @click="filter = null">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <WallWidget id="search" class="w-search" label="Find a frame" icon="search" :sheet="false">
        <WallSearch :preview="byNumber" :find="goToNumber" />
      </WallWidget>

      <WallWidget v-if="!mobile" id="feed" class="w-feed" label="Just immortalized" icon="feed">
        <RecentFeed @pick="show" />
      </WallWidget>

      <div class="controls">
        <button
          type="button"
          class="btn btn--ghost zones"
          role="switch"
          :aria-checked="showZones"
          @click="toggleZones"
        >
          <span class="zones__track" aria-hidden="true"><span class="zones__thumb" /></span>
          <span>Zones</span>
        </button>
        <button type="button" class="btn btn--ghost btn--icon" aria-label="Zoom in" @click="wall?.zoomBy(1.5)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button type="button" class="btn btn--ghost btn--icon" aria-label="Zoom out" @click="wall?.zoomBy(1 / 1.5)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
        </button>
        <button type="button" class="btn btn--ghost" @click="wall?.centerOn(HEART.x + HEART.size / 2, HEART.y + HEART.size / 2, 32)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
          <span class="controls__label">Back to the heart</span>
        </button>
      </div>

      <div class="side">
        <WallWidget v-if="mobile" id="feed" label="Just immortalized" icon="feed" :badge="feedBadge">
          <RecentFeed embedded @pick="show($event); openWidget = null" @arrived="onArrived" />
        </WallWidget>
        <WallWidget id="stats" label="The wall" icon="stats" framed>
          <WallStats @highlight="highlightZone = $event" @fit="fitZone" />
        </WallWidget>
        <WallWidget id="map" label="Map" icon="map" framed>
          <WallMinimap :view="view" @jump="wall?.centerOn($event.x, $event.y); openWidget = null" />
        </WallWidget>
      </div>

      <div v-if="heartOpen" class="selected">
        <HeartCard @close="heartOpen = false" />
      </div>
      <div v-else-if="selected" class="selected">
        <FrameCard :frame="selected" @close="onSelect(null)" @report="onReport" @filter="applyFilter" />
        <p v-if="reported" class="selected__toast" role="status">{{ reported }}</p>
        <p v-else-if="notice" class="selected__toast selected__toast--mine" role="status">{{ notice }}</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page { height: 100dvh; display: flex; flex-direction: column; }
.stage { position: relative; flex: 1; min-height: 0; background: #07050A; }
.controls {
  position: absolute;
  left: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.w-search { position: absolute; top: 12px; left: 16px; z-index: 3; }
/* The filter chip: top center under the status pill, in the colour of the tag. */
.filter {
  position: absolute;
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 12px;
  border: 1px solid color-mix(in srgb, var(--tag) 45%, transparent);
  border-radius: 999px;
  background: var(--panel);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow);
  font-size: 13px;
  color: var(--ink-2);
  white-space: nowrap;
}
.filter i { width: 8px; height: 8px; border-radius: 50%; background: var(--tag); box-shadow: 0 0 8px var(--tag); }
.filter b { color: var(--tag); font-weight: 600; }
.filter__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}
.filter__clear:hover { color: var(--ink); background: var(--line); }
/* The zones switch: a small track that fills with the zone colours when on. */
.zones { gap: 8px; }
.zones__track {
  position: relative;
  width: 30px;
  height: 18px;
  border-radius: 999px;
  background: var(--line-strong);
  transition: background 0.2s;
}
.zones__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s;
}
.zones[aria-checked='true'] .zones__track {
  background: linear-gradient(90deg, #6F7CFF, #FF5A4E, #FF4D8D);
}
.zones[aria-checked='true'] .zones__thumb { transform: translateX(12px); }
@media (prefers-reduced-motion: reduce) {
  .zones__track, .zones__thumb { transition: none; }
}
/* Under the search, above the zones switch and zoom buttons (4 × 44px + gaps). */
.w-feed {
  position: absolute;
  top: 68px;
  left: 16px;
  max-height: calc(100% - 68px - 240px);
  z-index: 1;
  display: flex;
  flex-direction: column;
}
.side {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  z-index: 1;
}
.selected {
  position: absolute;
  top: 72px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  z-index: 2;
}
.selected__toast {
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--panel);
  border: 1px solid var(--line);
  color: var(--ink);
  font-size: 13px;
  max-width: 320px;
}
.selected__toast--mine { background: #FFD27A; color: #3A2606; }
@media (max-width: 720px) {
  .w-search { left: 12px; }
  /* Right of the search icon, clear of the corner widgets. */
  .filter { top: 12px; left: 64px; right: 12px; transform: none; justify-content: space-between; }
  /* The status pills move below the search icon. */
  .stage :deep(.status) { top: 68px; }
  /* Feed, stats and map fold into icons in the bottom-right corner. */
  .side { right: 12px; bottom: 16px; }
  .controls__label { display: none; }
  .selected {
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    align-items: stretch;
  }
  .selected :deep(.card), .selected :deep(.heart) {
    width: 100%;
    border-radius: 16px 16px 0 0;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
  .selected__toast { margin: 0 16px 8px; order: -1; }
}
</style>

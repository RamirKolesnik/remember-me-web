<script setup lang="ts">
import { HEART, ZONES } from '~/shared/wall'
import { fromApi, type ApiFrame, type WallFrame } from '~/composables/useWall'
import type { ClosedZone, WallView } from '~/components/WallCanvas.vue'
import { unlockText } from '~/shared/news'
import { tierOf } from '~/shared/tiers'
import { readMine } from '~/shared/mine'

const { frames, frameAt, status, load, byId, byNumber } = useWall()
const api = useApi()
const route = useRoute()
const wall = ref<{ zoomBy: (f: number) => void; centerOn: (x: number, y: number, s?: number) => void } | null>(null)
const selected = ref<WallFrame | null>(null)
const view = ref<WallView | null>(null)
const reported = ref<string | null>(null)
const heartOpen = ref(false)
// Frames this visitor bought, remembered in the browser, and the one they
// just bought (back from the payment: /?n=…&mine=1).
const mine = ref<number[]>([])
const celebrate = ref<number | null>(null)
const notice = ref<string | null>(null)

const { pricing } = usePricing()
const closed = computed<ClosedZone[]>(() => {
  const p = pricing.value
  // Until prices arrive, the rings of later waves are shown closed, so the
  // wall does not look open to the edge for a moment.
  if (!p) return ZONES.filter((z) => z.wave > 1).map((z) => ({
    id: z.id,
    title: `${tierOf(z.id).body} · ${tierOf(z.id).name} · wave ${z.wave}`,
    detail: '',
  }))
  return p.zones.filter((z) => !z.open).map((z) => ({
    id: z.zone.id,
    title: `${tierOf(z.zone.id).body} · ${tierOf(z.zone.id).name} · wave ${z.zone.wave}`,
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
          @select="onSelect"
          @heart="onSelect(null); heartOpen = true"
          @view="view = $event"
        />
      </ClientOnly>

      <WallStatus />

      <WallSearch class="search" :preview="byNumber" :find="goToNumber" />

      <RecentFeed class="feed" @pick="show" />

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
        <WallStats />
        <WallMinimap :view="view" @jump="wall?.centerOn($event.x, $event.y)" />
      </div>

      <div v-if="heartOpen" class="selected">
        <HeartCard @close="heartOpen = false" />
      </div>
      <div v-else-if="selected" class="selected">
        <FrameCard :frame="selected" @close="onSelect(null)" @report="onReport" />
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
.search { position: absolute; top: 12px; left: 16px; z-index: 2; }
/* The zones switch: a small track that fills with the zone colours when on. */
.zones { gap: 8px; }
.zones__track {
  position: relative;
  width: 30px;
  height: 18px;
  border-radius: 999px;
  background: #D3D1C7;
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
  box-shadow: 0 1px 2px rgba(24, 23, 28, 0.25);
  transition: transform 0.2s;
}
.zones[aria-checked='true'] .zones__track {
  background: linear-gradient(90deg, #5AAE4F, #4C8BE0, #9B6FE0);
}
.zones[aria-checked='true'] .zones__thumb { transform: translateX(12px); }
@media (prefers-reduced-motion: reduce) {
  .zones__track, .zones__thumb { transition: none; }
}
/* Under the search, above the zones switch and zoom buttons (4 × 44px + gaps). */
.feed {
  position: absolute;
  top: 68px;
  left: 16px;
  max-height: calc(100% - 68px - 240px);
  z-index: 1;
}
.side {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
.selected__toast--mine { background: #FFD27A; color: #3A2606; }
.selected__toast {
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--ink);
  color: #fff;
  font-size: 13px;
  max-width: 320px;
}
@media (max-width: 720px) {
  .search { left: 12px; right: 12px; }
  /* The status pills move below the search bar. */
  .stage :deep(.status) { top: 64px; }
  .side { display: none; }
  /* Stats and minimap are hidden here, so the feed takes their corner. */
  .feed {
    top: auto;
    left: auto;
    right: 12px;
    bottom: 16px;
    max-height: calc(100% - 140px);
  }
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
  .selected__toast--mine { background: #FFD27A; color: #3A2606; }
.selected__toast { margin: 0 16px 8px; order: -1; }
}
</style>

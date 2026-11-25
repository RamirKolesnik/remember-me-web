<script setup lang="ts">
import { formatUsd, FRAME_SIZE, HEART, placementError, priceOf, zoneOfCell } from '~/shared/wall'
import { tierOf } from '~/shared/tiers'
import type { Ghost } from '~/components/WallCanvas.vue'
import { ApiError } from '~/composables/useApi'

useHead({ title: 'Choose your spot — remember.me' })

const draft = useDraft()
const api = useApi()
const route = useRoute()
const { frames, frameAt, isFree, load } = useWall()
const size = FRAME_SIZE

// The chosen top-left cell.
const spot = ref<{ x: number; y: number } | null>(null)
const hover = ref<{ x: number; y: number } | null>(null)
const human = ref(false)
const reserved = ref(false)
const busy = ref(false)
const reserveError = ref<string | null>(null)
const heldCheckout = ref<string | null>(null)
const cancelled = computed(() => route.query.cancelled === '1')

onMounted(() => {
  if (!draft.value.name || !draft.value.photo) {
    navigateTo('/immortalize')
    return
  }
  // Fresh data: other people may have bought or held spots meanwhile.
  load(true)
})

const problem = computed(() => {
  const p = spot.value
  if (!p) return null
  const err = placementError(p.x, p.y)
  if (err === 'out_of_bounds') return 'That spot is off the wall.'
  if (err === 'heart_not_for_sale') return "The heart isn't sold on the site — pick a spot around it."
  if (!isFree(p.x, p.y, size)) return 'Someone is already there — pick a free spot.'
  return null
})

const ghost = computed<Ghost | null>(() => {
  const p = hover.value ?? spot.value
  if (!p) return null
  const valid = placementError(p.x, p.y) === null && isFree(p.x, p.y, size)
  return { x: p.x, y: p.y, size, valid }
})

const zone = computed(() => (spot.value ? zoneOfCell(spot.value.x, spot.value.y) : null))
/** In cents. */
const price = computed(() => (spot.value && !problem.value ? priceOf(spot.value.x, spot.value.y) : null))
// Cells between the frame and the edge of the heart.
const distance = computed(() => {
  if (!spot.value) return 0
  const mid = HEART.x + HEART.size / 2
  const cx = spot.value.x + size / 2, cy = spot.value.y + size / 2
  const d = Math.max(Math.abs(cx - mid), Math.abs(cy - mid)) - (HEART.size + size) / 2
  return Math.max(0, Math.floor(d))
})
const canReserve = computed(() => price.value !== null && human.value)

function onPick(cell: { x: number; y: number }) {
  spot.value = cell
  reserved.value = false
}

function onNudge(d: { dx: number; dy: number }) {
  const base = spot.value ?? { x: HEART.x + HEART.size, y: HEART.y }
  spot.value = { x: base.x + d.dx, y: base.y + d.dy }
  hover.value = null
}

const RESERVE_ERRORS: Record<string, string> = {
  spot_taken: 'Someone just took that spot. Pick another one.',
  out_of_bounds: 'That spot is off the wall.',
  heart_not_for_sale: "The heart isn't sold on the site — pick a spot around it.",
  links_not_allowed: "Links aren't allowed in the name or note.",
  unknown_photo: 'Your photo expired. Go back and upload it again.',
  captcha_failed: "Captcha check failed. Try again.",
  payments_unavailable: "Payments aren't available right now.",
}

async function reserve() {
  if (!canReserve.value || busy.value || !spot.value) return
  reserveError.value = null
  heldCheckout.value = null
  if (!api.live) {
    reserved.value = true
    return
  }
  busy.value = true
  try {
    const res = await api.post<{ checkoutUrl: string }>('/reservations', {
      x: spot.value.x, y: spot.value.y,
      name: draft.value.name.trim(), note: draft.value.note.trim(),
      ...(draft.value.photoKey ? { photoKey: draft.value.photoKey } : {}),
    })
    window.location.href = res.checkoutUrl
  } catch (err) {
    busy.value = false
    if (err instanceof ApiError && err.body.error === 'hold_exists') {
      reserveError.value = 'You already have a spot on hold. Finish paying for it or cancel it first.'
      heldCheckout.value = typeof err.body.checkoutUrl === 'string' ? err.body.checkoutUrl : null
      return
    }
    const code = err instanceof ApiError ? String(err.body.error ?? '') : ''
    reserveError.value = RESERVE_ERRORS[code] ?? "Couldn't reserve the spot. Try again."
    if (code === 'spot_taken') load(true)
  }
}

const fmt = formatUsd
</script>

<template>
  <div class="page">
    <SiteHeader :step="2" />
    <main class="main">
      <section class="wallbox" aria-label="Pick a spot on the wall">
        <ClientOnly>
          <WallCanvas
            :frames="frames"
            :frame-at="frameAt"
            placing
            show-zones
            :ghost="ghost"
            :ghost-size="size"
            :initial-cell-px="12"
            @pick="onPick"
            @hover="hover = $event"
            @nudge="onNudge"
          />
        </ClientOnly>
        <p class="hint">Tap a free spot. Drag to move, pinch or scroll to zoom. Arrow keys nudge the frame.</p>
      </section>

      <aside class="side">
        <p v-if="cancelled" class="held" role="status">Payment cancelled — the spot is free again. Pick any spot to try again.</p>
        <div class="panel">
          <h1>Your spot</h1>
          <p v-if="!spot" class="muted">Pick a free spot on the wall. The closer to the heart, the more it costs.</p>
          <template v-else>
            <dl class="facts">
              <dt>Cell</dt><dd>({{ spot.x }}, {{ spot.y }})</dd>
              <dt>Zone</dt><dd>{{ zone ? tierOf(zone.id).name : '' }}</dd>
              <dt>To the heart</dt><dd>{{ distance }} {{ distance === 1 ? 'cell' : 'cells' }}</dd>
            </dl>
            <p v-if="problem" class="pill pill--danger problem" role="alert">{{ problem }}</p>
            <div v-else-if="price !== null" class="total">
              <span class="muted">{{ zone ? tierOf(zone.id).name : '' }} spot</span>
              <span class="total__price">{{ fmt(price) }}</span>
            </div>
          </template>

          <label class="captcha">
            <input v-model="human" type="checkbox">
            <span>Verify you're human</span>
            <small>captcha</small>
          </label>

          <button type="button" class="btn btn--lg" :aria-disabled="!canReserve || busy" @click="reserve">
            {{ busy ? 'Reserving…' : price !== null ? `Reserve & pay ${fmt(price)}` : 'Reserve & pay' }}
          </button>
          <p v-if="reserveError" class="pill pill--danger problem" role="alert">{{ reserveError }}</p>
          <a v-if="heldCheckout" :href="heldCheckout" class="btn btn--ghost">Go to my held spot</a>
          <p class="muted small">We hold the spot for 15 minutes while you pay. Cards, Apple Pay, Google Pay and PayPal.</p>
        </div>

        <div v-if="reserved" class="held" role="status">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" /></svg>
          <div>
            <b>Demo: payments aren't live yet.</b>
            <span>On the real site this spot would now be held for 15:00 while you pay.</span>
          </div>
        </div>

        <NuxtLink to="/immortalize" class="back">← Back to details</NuxtLink>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.page { min-height: 100dvh; display: flex; flex-direction: column; }
.main { flex: 1; display: flex; flex-wrap: wrap; gap: 24px; padding: 24px; }
.wallbox {
  flex: 999 1 560px;
  min-width: 0;
  min-height: 560px;
  position: relative;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: #FBFAF7;
}
.hint {
  position: absolute;
  left: 12px;
  bottom: 12px;
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--paper);
  border: 1px solid var(--line);
  font-size: 12px;
  color: var(--ink-2);
  pointer-events: none;
}
.side { flex: 1 1 320px; display: flex; flex-direction: column; gap: 16px; }
.panel {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.panel h1 { margin: 0; font-family: var(--font-display); font-size: 24px; font-weight: 600; }
.muted { color: var(--muted); font-size: 14px; margin: 0; line-height: 1.5; }
.small { font-size: 13px; }
.facts { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; font-size: 14px; }
.facts dt { color: var(--muted); }
.facts dd { margin: 0; font-weight: 500; }
.problem { margin: 0; align-self: flex-start; font-size: 13px; }
.total { display: flex; justify-content: space-between; align-items: baseline; padding-top: 14px; border-top: 1px solid var(--line-soft); }
.total__price { font-family: var(--font-display); font-size: 32px; font-weight: 600; }
.captcha {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #D3D1C7;
  border-radius: var(--radius);
  background: #FBFAF7;
  font-size: 14px;
  cursor: pointer;
}
.captcha input { width: 22px; height: 22px; margin: 0; accent-color: var(--accent); }
.captcha span { flex: 1; }
.captcha small { font-size: 11px; color: var(--muted); }
.held {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--amber-soft);
  border: 1px solid #FAC775;
  color: #633806;
  font-size: 13px;
  line-height: 1.5;
}
.held div { display: flex; flex-direction: column; gap: 2px; }
.back { font-size: 14px; }
@media (max-width: 720px) {
  .main { padding: 12px; gap: 12px; }
  .wallbox { min-height: 56dvh; flex-basis: 100%; }
  .hint { font-size: 11px; right: 12px; }
}
</style>

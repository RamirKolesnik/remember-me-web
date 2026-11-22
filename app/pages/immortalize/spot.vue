<script setup lang="ts">
import { basePrice, HEART, isHeart, placementError, priceOf, zoneOfFrame, type FrameSize } from '~/shared/wall'
import type { Ghost } from '~/components/WallCanvas.vue'

useHead({ title: 'Choose your spot — remember.me' })

const draft = useDraft()
const { frames, frameAt, isFree } = useWall()
const size = computed(() => draft.value.size as FrameSize)

// The chosen top-left cell; starts just right of the heart.
const spot = ref<{ x: number; y: number } | null>(null)
const hover = ref<{ x: number; y: number } | null>(null)
const human = ref(false)
const reserved = ref(false)

onMounted(() => {
  if (!draft.value.name || !draft.value.photo) navigateTo('/immortalize')
})

const problem = computed(() => {
  const p = spot.value
  if (!p) return null
  const err = placementError(p.x, p.y, size.value)
  if (err === 'out_of_bounds') return 'That spot is off the wall.'
  if (err === 'heart_needs_1x1') return 'Only a 1×1 frame can take the heart.'
  if (!isFree(p.x, p.y, size.value)) return 'Someone is already there — pick a free spot.'
  return null
})

const ghost = computed<Ghost | null>(() => {
  const p = hover.value ?? spot.value
  if (!p) return null
  const valid = placementError(p.x, p.y, size.value) === null && isFree(p.x, p.y, size.value)
  return { x: p.x, y: p.y, size: size.value, valid }
})

const zone = computed(() => (spot.value ? zoneOfFrame(spot.value.x, spot.value.y, size.value) : null))
const price = computed(() => (spot.value && !problem.value ? priceOf(spot.value.x, spot.value.y, size.value) : null))
const heart = computed(() => !!spot.value && isHeart(spot.value.x, spot.value.y, size.value))
const distance = computed(() => {
  if (!spot.value) return 0
  const cx = spot.value.x + (size.value - 1) / 2, cy = spot.value.y + (size.value - 1) / 2
  return Math.round(Math.max(Math.abs(cx - HEART.x), Math.abs(cy - HEART.y)))
})
const canReserve = computed(() => price.value !== null && human.value)

function onPick(cell: { x: number; y: number }) {
  spot.value = cell
  reserved.value = false
}

function onNudge(d: { dx: number; dy: number }) {
  const base = spot.value ?? { x: HEART.x + 1, y: HEART.y }
  spot.value = { x: base.x + d.dx, y: base.y + d.dy }
  hover.value = null
}

function reserve() {
  if (!canReserve.value) return
  reserved.value = true
}

const fmt = (n: number) => `$${n.toLocaleString('en-US')}`
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
        <div class="panel">
          <h1>Your spot</h1>
          <p v-if="!spot" class="muted">Pick a free spot on the wall. The closer to the heart, the more it costs.</p>
          <template v-else>
            <dl class="facts">
              <dt>Frame</dt><dd>{{ size }}×{{ size }} · {{ size * size }} {{ size === 1 ? 'cell' : 'cells' }}</dd>
              <dt>Cells</dt><dd>({{ spot.x }}{{ size > 1 ? `–${spot.x + size - 1}` : '' }}, {{ spot.y }}{{ size > 1 ? `–${spot.y + size - 1}` : '' }})</dd>
              <dt>Zone</dt><dd>{{ heart ? 'The heart' : `Zone ${zone?.id} · ×${zone?.multiplier}` }}</dd>
              <dt>To the heart</dt><dd>{{ distance }} {{ distance === 1 ? 'cell' : 'cells' }}</dd>
            </dl>
            <p v-if="problem" class="pill pill--danger problem" role="alert">{{ problem }}</p>
            <div v-else-if="price !== null" class="total">
              <span class="muted">{{ heart ? 'Fixed price' : `(${basePrice(size) - size * size} + ${size * size}) × ${zone?.multiplier}` }}</span>
              <span class="total__price">{{ fmt(price) }}</span>
            </div>
          </template>

          <label class="captcha">
            <input v-model="human" type="checkbox">
            <span>Verify you're human</span>
            <small>captcha</small>
          </label>

          <button type="button" class="btn btn--lg" :aria-disabled="!canReserve" @click="reserve">
            {{ price !== null ? `Reserve & pay ${fmt(price)}` : 'Reserve & pay' }}
          </button>
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

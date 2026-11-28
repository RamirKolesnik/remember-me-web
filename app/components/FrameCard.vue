<script setup lang="ts">
import type { WallFrame } from '~/composables/useWall'
import { isHeart, isFounder, luckyKind, tagsOf, type TagId } from '~/shared/wall'
import { frameAccent } from '~/shared/tags'
import { frameLink, shareText, storyFileName } from '~/shared/share'
import { beatStep, purchasesLastHour } from '~/shared/heartbeat'

const props = withDefaults(defineProps<{
  frame: WallFrame
  /** Bought by this visitor (remembered in the browser). */
  mine?: boolean
}>(), { mine: false })
const emit = defineEmits<{ close: []; report: [frame: WallFrame]; filter: [tag: TagId] }>()

const api = useApi()
const config = useRuntimeConfig()
const { frames } = useWall()
const { milestones } = usePricing()

// What makes this card special. The heart outranks the Founder's red rim,
// which outranks the zone colour.
const heart = computed(() => isHeart(props.frame.x, props.frame.y, props.frame.size))
const founder = computed(() => !heart.value && isFounder(props.frame.number))
const lucky = computed(() => luckyKind(props.frame.number) !== null)
const tags = computed(() => tagsOf(props.frame, milestones.value))
const neighbour = computed(() => tags.value.some((t) => t.id === 'heart-neighbour'))
// The card wears the frame's zone colour: rim, glow and a ring around the photo.
const accent = computed(() => frameAccent(props.frame))
// The more tags, the brighter it glows.
const glow = computed(() => {
  const n = tags.value.length
  return n >= 3 ? { mix: 60, k: 1 } : n === 2 ? { mix: 42, k: 0.5 } : { mix: 28, k: 0 }
})
// Heart neighbours pulse with the heart: the same pace as on the wall.
const beat = computed(() => `${beatStep(purchasesLastHour(frames.value, Date.now())).every}s`)

const numberText = computed(() => props.frame.number ? `Heartbeat #${props.frame.number.toLocaleString('en-US')}` : '')

// Share: the system sheet where there is one, otherwise the link is copied.
const toast = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
function say(text: string) {
  toast.value = text
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 2500)
}
const link = () => frameLink(window.location.origin, config.app.baseURL, props.frame)
async function share() {
  const url = link()
  const text = props.mine
    ? shareText({ number: props.frame.number, isHeart: heart.value })
    : `${props.frame.name} is on The Living Wall. Forever.`
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'The Living Wall', text, url })
    } catch { /* closed the sheet */ }
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    say('Link copied')
  } catch {
    say(url)
  }
}

// Your own frame: its story card, again.
const downloading = ref(false)
async function downloadStory() {
  if (downloading.value) return
  downloading.value = true
  try {
    const res = await fetch(`${api.base}/frames/${props.frame.id}/story.jpg`)
    if (!res.ok) throw new Error(String(res.status))
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = url
    a.download = storyFileName(props.frame.id)
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  } catch {
    say("Couldn't get the story card. Try again in a moment.")
  } finally {
    downloading.value = false
  }
}

const nearby = () => navigateTo({ path: '/immortalize', query: { near: `${props.frame.x},${props.frame.y}` } })
</script>

<template>
  <section
    class="card"
    :class="{
      'card--heart': heart,
      'card--founder': founder,
      'card--neighbour': neighbour,
      'card--mine': mine,
    }"
    :style="{ '--zone': accent, '--glow': `${glow.mix}%`, '--glow-k': glow.k, '--beat': beat }"
    :aria-label="`Frame of ${frame.name}`"
  >
    <button type="button" class="card__close btn btn--ghost btn--icon" aria-label="Close" @click="emit('close')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
    <p v-if="mine" class="card__you">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4h2c.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg>
      This is you
    </p>
    <div class="card__top">
      <div class="card__face">
        <div class="card__avatar" :style="{ background: frame.color, color: frame.ink }">
          <img v-if="frame.photoUrl" :src="frame.photoUrl" :alt="`Photo of ${frame.name}`">
          <template v-else>{{ frame.initials }}</template>
        </div>
        <span v-if="founder" class="card__star" title="Founder: one of the first 1,000 frames" aria-hidden="true">★</span>
      </div>
      <div class="card__who">
        <span class="card__name">{{ frame.name }}</span>
        <span v-if="lucky" class="card__lucky">{{ numberText }}</span>
        <span class="card__meta">
          <template v-if="numberText && !lucky">{{ numberText }} · </template>{{ frame.placedAt }}
        </span>
      </div>
    </div>
    <FrameTags :frame="frame" clickable @filter="emit('filter', $event)" />
    <p v-if="frame.note" class="card__note">{{ frame.note }}</p>
    <div class="card__actions">
      <button type="button" class="act" @click="share">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" /></svg>
        Share
      </button>
      <button v-if="mine && api.live && !heart" type="button" class="act" :disabled="downloading" @click="downloadStory">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
        {{ downloading ? 'Preparing…' : 'Story card' }}
      </button>
      <button type="button" class="act act--main" @click="nearby">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Claim a spot nearby
      </button>
    </div>
    <p v-if="toast" class="card__toast" role="status">{{ toast }}</p>
    <div class="card__foot">
      <span>Cell ({{ frame.x }}, {{ frame.y }})</span>
      <button type="button" class="card__report" @click="emit('report', frame)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4h11l-1.5 4L16 12H5" /></svg>
        Report
      </button>
    </div>
  </section>
</template>

<style scoped>
.card {
  --gold: #FFD27A;
  position: relative;
  width: 320px;
  max-width: 100%;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--zone) 16%, transparent), transparent 140px),
    var(--panel);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1.5px solid color-mix(in srgb, var(--zone) 70%, transparent);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--shadow), 0 0 calc(16px + 24px * var(--glow-k, 0)) color-mix(in srgb, var(--zone) var(--glow), transparent);
}
.card__close { position: absolute; top: 8px; right: 8px; border: 0; z-index: 1; }
.card__top { display: flex; gap: 14px; align-items: center; padding-right: 40px; }
.card__face { position: relative; flex-shrink: 0; }
.card__avatar {
  width: 88px;
  height: 88px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 600;
  overflow: hidden;
  outline: 2px solid var(--zone);
  outline-offset: 2px;
}
.card__avatar img { width: 100%; height: 100%; object-fit: cover; }
.card__who { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.card__name { font-size: 17px; font-weight: 600; overflow-wrap: anywhere; }
.card__meta { font-size: 12px; color: var(--muted); }
.card__note { margin: 0; font-size: 15px; line-height: 1.5; color: var(--ink-2); overflow-wrap: anywhere; }

/* 1. Founder: the Founder tag's look on the whole card (its red, softly
   filled), with a sheen that runs slowly round the rim. */
.card--founder {
  --founder: #FF3B52;
  border-color: transparent;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--founder) 14%, transparent), transparent 140px),
    var(--panel);
  box-shadow: var(--shadow), 0 0 calc(16px + 24px * var(--glow-k, 0)) color-mix(in srgb, var(--founder) var(--glow), transparent);
}
.card--founder::before {
  content: '';
  position: absolute;
  inset: -1.5px;
  padding: 1.5px;
  border-radius: inherit;
  background: conic-gradient(
    from var(--spin),
    color-mix(in srgb, var(--founder) 35%, transparent) 0deg,
    color-mix(in srgb, var(--founder) 35%, transparent) 250deg,
    var(--founder) 300deg,
    #FFB3BD 320deg,
    var(--founder) 340deg,
    color-mix(in srgb, var(--founder) 35%, transparent) 360deg
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  animation: rm-spin 5s linear infinite;
  pointer-events: none;
}
.card--founder .card__avatar { outline-color: color-mix(in srgb, var(--founder) 70%, transparent); }
/* The star, as on the tag: red on a soft red pill. */
.card__star {
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, #FF3B52 35%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, #FF3B52 22%, var(--paper));
  color: #FF3B52;
  font-size: 11px;
}

/* 2. Lucky numbers: the number, big and shining. */
.card__lucky {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
  background: linear-gradient(100deg, #C98A1E 0%, var(--gold) 30%, #FFF8E1 45%, var(--gold) 60%, #C98A1E 100%) 0 0 / 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: rm-shine 3s linear infinite;
}

/* 3. Heart neighbours: the rim beats with the heart. */
.card--neighbour { animation: card-beat var(--beat, 6s) ease-out infinite; }
@keyframes card-beat {
  0%, 30%, 100% { box-shadow: var(--shadow), 0 0 20px color-mix(in srgb, var(--heart) 25%, transparent); }
  6% { box-shadow: var(--shadow), 0 0 0 2px var(--heart), 0 0 36px color-mix(in srgb, var(--heart) 70%, transparent); }
  13% { box-shadow: var(--shadow), 0 0 22px color-mix(in srgb, var(--heart) 30%, transparent); }
  19% { box-shadow: var(--shadow), 0 0 0 1px var(--heart), 0 0 30px color-mix(in srgb, var(--heart) 55%, transparent); }
}

/* 4. The heart's owner: fire flows through the card, like the heart on the wall. */
.card--heart {
  border-color: rgba(255, 181, 71, 0.8);
  background:
    linear-gradient(180deg, rgba(24, 8, 10, 0.55), rgba(24, 8, 10, 0.88) 55%),
    linear-gradient(110deg, #FFB547, #FF5A3C, #FF3B52, #C2183A, #FF5A3C, #FFB547) 0 0 / 300% 100%;
  animation: rm-flow 8s linear infinite;
  box-shadow: var(--shadow), 0 0 36px rgba(255, 90, 60, 0.55);
}
.card--heart .card__avatar { outline-color: #FFB547; }

/* 5. The more tags, the brighter: --glow and --glow-k come from the tag count. */

/* 7. Your own frame. */
.card__you {
  margin: -4px 0 0;
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--mine);
  color: #3A2606;
  font-size: 12px;
  font-weight: 700;
}

/* 6. Share and "claim a spot nearby". */
.card__actions { display: flex; flex-wrap: wrap; gap: 8px; }
.act {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.act:hover { background: var(--line); }
.act:disabled { cursor: progress; color: var(--muted); }
.act--main { margin-left: auto; border-color: transparent; background: var(--accent); color: #fff; }
.act--main:hover { background: var(--accent-hover); }
.card__toast { margin: -4px 0 0; font-size: 12px; color: var(--ok); overflow-wrap: anywhere; }

.card__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--line-soft);
  padding-top: 8px;
  font-size: 12px;
  color: var(--muted);
}
.card__report {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
}
.card__report:hover { color: var(--danger); }

@media (prefers-reduced-motion: reduce) {
  .card--founder::before, .card__lucky, .card--neighbour, .card--heart { animation: none; }
}
</style>

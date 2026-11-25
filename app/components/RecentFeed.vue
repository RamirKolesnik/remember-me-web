<script setup lang="ts">
import { fromApi, type ApiFrame, type WallFrame } from '~/composables/useWall'
import { newcomers, newestNumber, timeAgo } from '~/shared/recent'
import { isHeart, zoneOfFrame } from '~/shared/wall'
import { tierOf } from '~/shared/tiers'

// embedded: inside a phone sheet, which does the folding; no header of its own.
const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const emit = defineEmits<{ pick: [frame: WallFrame]; arrived: [count: number] }>()

const LIMIT = 12
const POLL_MS = 10_000
const STORAGE_KEY = 'rm.feed.collapsed'

const api = useApi()
const { frames: wallFrames, status, addFrames, byId, isDemo } = useWall()

const items = shallowRef<WallFrame[]>([])
/** Hidden until the first answer, so an API without the feed shows nothing. */
const loaded = ref(false)
const fresh = ref(new Set<number>())
const unseen = ref(0)
const collapsed = ref(false)
const now = ref(Date.now())
let seen: number | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let ticker: ReturnType<typeof setInterval> | null = null
let busy = false
let mobile = false

const fmt = (n: number) => n.toLocaleString('en-US')

function metaOf(f: WallFrame) {
  if (isHeart(f.x, f.y, f.size)) return { text: 'The heart', color: 'var(--heart)' }
  const z = zoneOfFrame(f.x, f.y, f.size)
  return { text: `in the ${tierOf(z.id).name}`, color: tierOf(z.id).accent }
}

/** Takes a fresh list of the newest frames: marks newcomers, puts them on the wall. */
function take(list: WallFrame[]) {
  const ids = newcomers(seen, list)
  seen = newestNumber(seen, list)
  if (ids.length) {
    fresh.value = new Set([...fresh.value, ...ids])
    if (collapsed.value) unseen.value += ids.length
    emit('arrived', ids.length)
    // The highlight fades; the CSS animation runs once per element.
    setTimeout(() => {
      const next = new Set(fresh.value)
      ids.forEach((id) => next.delete(id))
      fresh.value = next
    }, 6_000)
  }
  // Same objects as on the wall, so the selected frame matches.
  addFrames(list)
  items.value = list.map((f) => byId(f.id) ?? f)
  loaded.value = true
}

async function poll() {
  timer = null
  if (busy || document.visibilityState !== 'visible') return
  busy = true
  try {
    const { frames } = await api.get<{ frames: ApiFrame[] }>(`/wall/recent?limit=${LIMIT}`)
    take(frames.map(fromApi))
  } catch {
    // Keep what we have; the next round tries again.
  } finally {
    busy = false
    schedule()
  }
}

function schedule() {
  if (timer || !api.live) return
  timer = setTimeout(poll, POLL_MS)
}

/** Demo wall: the newest demo frames, as if they arrived over the last hours. */
function demoFeed() {
  const top = [...wallFrames.value].sort((a, b) => (b.number ?? 0) - (a.number ?? 0)).slice(0, LIMIT)
  const t = Date.now()
  let ago = 40_000
  items.value = top.map((f, i) => {
    ago += (i * 7 + 3) * 60_000
    return { ...f, liveAt: t - ago }
  })
  loaded.value = true
}

function onVisible() {
  if (document.visibilityState !== 'visible' || !api.live) return
  now.value = Date.now()
  if (timer) clearTimeout(timer)
  timer = null
  poll()
}

watch(status, (s) => {
  if (s !== 'ready') return
  if (isDemo) demoFeed()
  else if (!timer && !busy) poll()
}, { immediate: true })

function toggle() {
  collapsed.value = !collapsed.value
  if (!collapsed.value) unseen.value = 0
  if (!mobile) {
    try { localStorage.setItem(STORAGE_KEY, collapsed.value ? '1' : '0') } catch { /* private mode */ }
  }
}

function pick(f: WallFrame) {
  emit('pick', f)
  if (mobile) collapsed.value = true
}

onMounted(() => {
  mobile = window.matchMedia('(max-width: 720px)').matches
  if (props.embedded) collapsed.value = false
  else if (mobile) collapsed.value = true
  else {
    try { collapsed.value = localStorage.getItem(STORAGE_KEY) === '1' } catch { /* private mode */ }
  }
  ticker = setInterval(() => { now.value = Date.now() }, 30_000)
  document.addEventListener('visibilitychange', onVisible)
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  if (ticker) clearInterval(ticker)
  document.removeEventListener('visibilitychange', onVisible)
})

const stack = computed(() => items.value.slice(0, 3))
</script>

<template>
  <section v-if="loaded" class="feed" :class="{ 'feed--collapsed': collapsed, 'feed--embedded': embedded }" aria-label="Just immortalized">
    <button
      v-if="!embedded"
      type="button"
      class="feed__head"
      :aria-expanded="!collapsed"
      aria-controls="feed-list"
      @click="toggle"
    >
      <span class="feed__live" :class="{ 'feed__live--on': !isDemo }" aria-hidden="true" />
      <span class="feed__title">Just immortalized</span>
      <span v-if="collapsed && stack.length" class="feed__stack" aria-hidden="true">
        <span v-for="f in stack" :key="f.id" class="feed__mini" :style="{ background: f.color, color: f.ink }">
          <img v-if="f.photoUrl" :src="f.photoUrl" alt="">
          <template v-else>{{ f.initials }}</template>
        </span>
      </span>
      <span v-if="collapsed && unseen" class="feed__badge">+{{ unseen }}<span class="sr-only"> new</span></span>
      <svg class="feed__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </button>

    <div v-show="!collapsed" id="feed-list" class="feed__body">
      <p v-if="!items.length" class="feed__empty">
        Nobody yet. <NuxtLink to="/immortalize">Be the first.</NuxtLink>
      </p>
      <TransitionGroup v-else tag="ol" name="feed" class="feed__list" aria-live="polite">
        <li v-for="f in items" :key="f.id">
          <button type="button" class="feed__item" :class="{ 'feed__item--fresh': fresh.has(f.id) }" @click="pick(f)">
            <span class="feed__avatar" :style="{ background: f.color, color: f.ink }">
              <img v-if="f.photoUrl" :src="f.photoUrl" alt="" loading="lazy">
              <template v-else>{{ f.initials }}</template>
            </span>
            <span class="feed__who">
              <span class="feed__name">{{ f.name }}</span>
              <span class="feed__meta">
                <i :style="{ background: metaOf(f).color }" />
                <template v-if="f.number">#{{ fmt(f.number) }} · </template>{{ metaOf(f).text }}
              </span>
            </span>
            <time
              v-if="f.liveAt"
              class="feed__time"
              :datetime="new Date(f.liveAt).toISOString()"
            >{{ timeAgo(f.liveAt, now) }}</time>
          </button>
        </li>
      </TransitionGroup>
    </div>
  </section>
</template>

<style scoped>
.feed {
  width: 260px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--panel);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
}
.feed--collapsed { width: auto; align-self: flex-start; }
.feed--embedded {
  width: 100%;
  background: transparent;
  border: 0;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.feed--embedded .feed__body { border-top: 0; }
.feed__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  flex-shrink: 0;
}
.feed__head:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: 12px; }
.feed__live { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); flex-shrink: 0; }
.feed__live--on { background: #FF3B52; box-shadow: 0 0 0 0 rgba(255, 59, 82, 0.5); animation: live 2s infinite; }
.feed__title { flex: 1; font-size: 13px; font-weight: 600; white-space: nowrap; }
.feed__stack { display: flex; }
.feed__mini {
  width: 22px;
  height: 22px;
  margin-left: -6px;
  border: 2px solid var(--paper);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 600;
}
.feed__mini:first-child { margin-left: 0; }
.feed__mini img { width: 100%; height: 100%; object-fit: cover; }
.feed__badge {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.feed__chev { color: var(--muted); transition: transform 0.15s; flex-shrink: 0; }
.feed--collapsed .feed__chev { transform: rotate(-90deg); }
.feed__body {
  min-height: 0;
  overflow-y: auto;
  border-top: 1px solid var(--line-soft);
  overscroll-behavior: contain;
}
.feed__empty { margin: 0; padding: 12px; font-size: 13px; color: var(--muted); }
.feed__list { margin: 0; padding: 4px; list-style: none; position: relative; }
.feed__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.feed__item:hover, .feed__item:focus-visible { background: var(--paper-2); outline: none; }
.feed__item--fresh { animation: fresh 6s ease-out; }
.feed__avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 13px;
}
.feed__avatar img { width: 100%; height: 100%; object-fit: cover; }
.feed__who { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.feed__name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.feed__meta { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--muted); white-space: nowrap; }
.feed__meta i { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.feed__time { align-self: flex-start; padding-top: 2px; font-size: 11px; color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }

.feed-enter-active { transition: opacity 0.4s, transform 0.4s; }
.feed-enter-from { opacity: 0; transform: translateY(-8px); }
.feed-leave-active { transition: opacity 0.2s; position: absolute; left: 4px; right: 4px; }
.feed-leave-to { opacity: 0; }
.feed-move { transition: transform 0.4s; }

@keyframes fresh {
  0%, 30% { background: var(--accent-soft); }
  100% { background: transparent; }
}
@keyframes live {
  0% { box-shadow: 0 0 0 0 rgba(255, 59, 82, 0.5); }
  70% { box-shadow: 0 0 0 6px rgba(255, 59, 82, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 59, 82, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .feed__live--on, .feed__item--fresh { animation: none; }
  .feed__item--fresh { background: var(--accent-soft); }
  .feed-enter-active, .feed-leave-active, .feed-move { transition: none; }
}
@media (max-width: 720px) {
  .feed { width: min(300px, calc(100vw - 24px)); }
  .feed--collapsed { width: auto; }
  .feed__item { min-height: 48px; }
}
</style>

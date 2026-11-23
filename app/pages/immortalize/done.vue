<script setup lang="ts">
import { fromApi, type ApiFrame, type WallFrame } from '~/composables/useWall'
import { ApiError } from '~/composables/useApi'

useHead({ title: 'You are on the wall — remember.me' })

const route = useRoute()
const api = useApi()
const { load } = useWall()
const draft = useDraft()
const frame = ref<WallFrame | null>(null)
const storyUrl = ref('')
const state = ref<'loading' | 'ok' | 'missing'>('loading')
const paid = ref(route.query.status !== 'expired')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// On a direct load the prerendered page hydrates with the build-time route
// (no query) and only then moves to the real address, so wait for the id to
// show up instead of reading it once.
let started = false
onMounted(() => {
  watch(() => route.query.id, (qid) => {
    if (started || !qid) return
    started = true
    openFrame(Number(qid), route.query.status)
  }, { immediate: true })
  setTimeout(() => {
    if (started) return
    started = true
    openFrame(NaN, route.query.status)
  }, 4000)
})

async function openFrame(id: number, status: unknown) {
  paid.value = status !== 'expired'
  if (!paid.value || !Number.isInteger(id) || id <= 0 || !api.live) {
    state.value = 'missing'
    return
  }
  // The payment provider may confirm a few seconds after it sends the buyer
  // back, and a sleeping test server can drop the first requests: keep trying.
  for (let attempt = 0; attempt < 8 && !frame.value; attempt++) {
    try {
      const f = await api.get<ApiFrame & { storyUrl?: string }>(`/frames/${id}`)
      // Older API versions do not send storyUrl.
      storyUrl.value = f.storyUrl || `${api.base}/frames/${f.id}/story.jpg`
      frame.value = fromApi(f)
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) console.error('Loading the frame failed', err)
      await sleep(2500)
    }
  }
  state.value = frame.value ? 'ok' : 'missing'
  if (frame.value) {
    draft.value = { name: '', note: '', photo: null, photoKey: null, size: 2 }
    // Refresh the wall so "See it on the wall" shows the new frame.
    load(true)
  }
}
</script>

<template>
  <div class="page">
    <SiteHeader :step="3" />
    <main :class="['main', { 'main--wide': state === 'ok' }]">
      <template v-if="!paid">
        <h1>Your hold ran out</h1>
        <p class="muted">The payment came after the 15-minute hold ended, so the spot was released. In the test environment no money moved.</p>
        <NuxtLink to="/immortalize/spot" class="btn btn--lg">Pick a spot again</NuxtLink>
      </template>
      <template v-else-if="state === 'loading'">
        <h1>Putting you on the wall…</h1>
      </template>
      <template v-else-if="state === 'ok' && frame">
        <span class="pill pill--ok">Payment received</span>
        <h1>You're on the wall. Forever.</h1>
        <ShareStory :frame="frame" :story-url="storyUrl" />
        <div class="actions">
          <NuxtLink :to="frame.number ? `/?n=${frame.number}` : `/?frame=${frame.id}`" class="btn btn--ghost btn--lg">See it on the wall</NuxtLink>
          <NuxtLink to="/immortalize" class="btn btn--ghost btn--lg">Add another frame</NuxtLink>
        </div>
      </template>
      <template v-else>
        <h1>We couldn't find that frame</h1>
        <p class="muted">If you just paid, it may take a moment to appear.</p>
        <NuxtLink to="/" class="btn btn--lg">Back to the wall</NuxtLink>
      </template>
    </main>
  </div>
</template>

<style scoped>
.main {
  max-width: 560px;
  margin: 0 auto;
  padding: 56px 24px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
}
.main--wide { max-width: 760px; }
h1 { margin: 0; font-family: var(--font-display); font-size: 34px; font-weight: 600; letter-spacing: -0.02em; }
.muted { margin: 0; color: var(--muted); line-height: 1.5; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; padding-top: 8px; border-top: 1px solid var(--line-soft); width: 100%; }
@media (max-width: 640px) {
  .main { padding: 32px 16px; }
  h1 { font-size: 28px; }
}
</style>

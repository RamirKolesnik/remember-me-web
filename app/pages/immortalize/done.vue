<script setup lang="ts">
import type { WallFrame } from '~/composables/useWall'

useHead({ title: 'You are on the wall — remember.me' })

const route = useRoute()
const api = useApi()
const { load, byId } = useWall()
const draft = useDraft()
const id = computed(() => Number(route.query.id))
const paid = computed(() => route.query.status !== 'expired')
const frame = ref<WallFrame | null>(null)
const state = ref<'loading' | 'ok' | 'missing'>('loading')

onMounted(async () => {
  if (!paid.value || !id.value || !api.live) {
    state.value = 'missing'
    return
  }
  await load(true)
  frame.value = byId(id.value)
  state.value = frame.value ? 'ok' : 'missing'
  if (frame.value) draft.value = { name: '', note: '', photo: null, photoKey: null, size: 2 }
})
</script>

<template>
  <div class="page">
    <SiteHeader :step="3" />
    <main class="main">
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
        <FrameCard :frame="frame" class="done-card" @close="navigateTo(`/?frame=${frame.id}`)" />
        <div class="actions">
          <NuxtLink :to="`/?frame=${frame.id}`" class="btn btn--lg">See it on the wall</NuxtLink>
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
h1 { margin: 0; font-family: var(--font-display); font-size: 34px; font-weight: 600; letter-spacing: -0.02em; }
.muted { margin: 0; color: var(--muted); line-height: 1.5; }
.done-card { box-shadow: none; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; }
</style>

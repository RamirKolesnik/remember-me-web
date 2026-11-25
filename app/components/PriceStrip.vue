<script setup lang="ts">
import { wallNews } from '~/shared/news'
import { tierOf } from '~/shared/tiers'

// One line under the header that cycles through what is about to change:
// the next price rise, founder spots left, the next ring to open.
const { pricing } = usePricing()
const news = computed(() => (pricing.value ? wallNews(pricing.value) : []))

const ROTATE_MS = 5_000
const index = ref(0)
const paused = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const item = computed(() => news.value.length ? news.value[index.value % news.value.length]! : null)
const dot = computed(() => {
  const n = item.value
  if (!n) return ''
  if (n.kind === 'founders') return 'var(--heart)'
  return n.zoneId ? tierOf(n.zoneId).accent : 'var(--ink)'
})

onMounted(() => {
  timer = setInterval(() => {
    if (!paused.value && news.value.length > 1) index.value = (index.value + 1) % news.value.length
  }, ROTATE_MS)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div
    v-if="item"
    class="strip"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
  >
    <span class="strip__icon" aria-hidden="true">
      <svg v-if="item.kind === 'step'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l6-6 4 4 6-7" /><path d="M14 8h6v6" /></svg>
      <svg v-else-if="item.kind === 'wave'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></svg>
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.4 6.7 19.1l1-5.8-4.2-4.1 5.9-.9z" /></svg>
    </span>
    <Transition name="strip" mode="out-in">
      <p :key="item.text" class="strip__text">
        <i class="strip__dot" :style="{ background: dot }" aria-hidden="true" />
        <span class="strip__msg">{{ item.text }}</span>
      </p>
    </Transition>
    <span v-if="news.length > 1" class="strip__count" aria-hidden="true">{{ (index % news.length) + 1 }}/{{ news.length }}</span>
    <NuxtLink to="/immortalize" class="strip__cta">Claim yours →</NuxtLink>
    <!-- Screen readers get the whole list once instead of a changing line. -->
    <ul class="sr-only" aria-label="What changes next on the wall">
      <li v-for="n in news" :key="n.text">{{ n.text }}</li>
    </ul>
  </div>
</template>

<style scoped>
.strip {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 6px 16px;
  background: var(--ink);
  color: #fff;
  font-size: 13px;
}
.strip__icon { display: inline-flex; color: #FFB86B; flex: none; }
.strip__text {
  flex: 1;
  min-width: 0;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}
.strip__msg { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.strip__dot { width: 8px; height: 8px; border-radius: 2px; flex: none; }
.strip__count { flex: none; font-size: 11px; color: rgba(255, 255, 255, 0.5); font-variant-numeric: tabular-nums; }
.strip__cta { flex: none; color: #fff; font-weight: 600; text-decoration: none; }
.strip__cta:hover { color: #FFB86B; }
.strip-enter-active, .strip-leave-active { transition: opacity 0.25s, transform 0.25s; }
.strip-enter-from { opacity: 0; transform: translateY(6px); }
.strip-leave-to { opacity: 0; transform: translateY(-6px); }
@media (prefers-reduced-motion: reduce) {
  .strip-enter-active, .strip-leave-active { transition: none; }
}
@media (max-width: 720px) {
  .strip { padding: 6px 12px; gap: 8px; font-size: 12px; }
  .strip__msg { white-space: normal; line-height: 1.3; }
  .strip__dot, .strip__count { display: none; }
}
</style>

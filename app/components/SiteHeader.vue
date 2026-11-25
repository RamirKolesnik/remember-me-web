<script setup lang="ts">
defineProps<{ step?: 1 | 2 | 3 }>()
</script>

<template>
  <header class="head">
    <NuxtLink to="/" class="head__logo" aria-label="The Living Wall, home">
      <!-- A heart with a heartbeat line through it: the wall is alive. -->
      <svg class="head__mark" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#1F0A10" />
        <path class="head__heart" d="M16 26C8 20.3 4.5 16.2 4.5 12.2 4.5 9 7 6.5 10.1 6.5c2.5 0 4.6 1.5 5.9 3.6 1.3-2.1 3.4-3.6 5.9-3.6 3.1 0 5.6 2.5 5.6 5.7 0 4-3.5 8.1-11.5 13.8z" fill="#FF3B52" />
        <path d="M3.5 15.5h6l2-4 3.2 8.5 3-11 2.3 6.5h8.5" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="head__name">The <b>Living</b> Wall</span>
    </NuxtLink>
    <ol v-if="step" class="head__steps" aria-label="Purchase steps">
      <li :class="step > 1 ? 'done' : 'now'">1 · Details</li>
      <li :class="step > 2 ? 'done' : step === 2 ? 'now' : ''">2 · Spot</li>
      <li :class="step === 3 ? 'now' : ''">3 · Pay</li>
    </ol>
    <div v-else class="head__right">
      <NuxtLink to="/immortalize" class="btn">Immortalize yourself</NuxtLink>
    </div>
  </header>
</template>

<style scoped>
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  padding: 10px 24px;
  background: #0E080A;
  border-bottom: 1px solid var(--line);
  position: relative;
  z-index: 2;
}
.head__logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  text-decoration: none;
}
.head__logo:hover { color: var(--ink); }
.head__mark { flex: none; }
.head__heart { transform-origin: 16px 16px; animation: logo-beat 10s infinite; }
.head__name {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.head__name b { font-weight: 600; color: var(--heart); }
.head__right { display: flex; align-items: center; }
.head__steps { display: flex; gap: 8px; margin: 0; padding: 0; list-style: none; font-size: 13px; }
.head__steps li { padding: 6px 12px; border-radius: 999px; background: var(--line-soft); color: var(--muted); }
.head__steps li.now { background: var(--accent); color: #fff; font-weight: 500; }
.head__steps li.done { background: var(--ok-soft); color: var(--ok); font-weight: 500; }
/* The same resting pace as the wall: one beat every 10 seconds. */
@keyframes logo-beat {
  0%, 6%, 100% { transform: scale(1); }
  1.5% { transform: scale(1.14); }
  3.5% { transform: scale(1.06); }
}
@media (prefers-reduced-motion: reduce) {
  .head__heart { animation: none; }
}
@media (max-width: 720px) {
  .head { padding: 8px 12px; }
  .head__name { font-size: 17px; }
  .head__steps { font-size: 12px; }
}
</style>

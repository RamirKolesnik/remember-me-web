<script setup lang="ts">
defineProps<{ step?: 1 | 2 | 3 }>()
</script>

<template>
  <header class="head">
    <NuxtLink to="/" class="head__logo">
      <span class="head__mark" aria-hidden="true"><i /><i /><i /><i /></span>
      remember.me
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
  padding: 12px 24px;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
  position: relative;
  z-index: 2;
}
.head__logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
}
.head__mark {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--accent);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 3px;
  padding: 5px;
}
.head__mark i { border-radius: 1px; background: #fff; }
.head__mark i:nth-child(2), .head__mark i:nth-child(3) { background: #CECBF6; }
.head__right { display: flex; align-items: center; }
.head__steps { display: flex; gap: 8px; margin: 0; padding: 0; list-style: none; font-size: 13px; }
.head__steps li { padding: 6px 12px; border-radius: 999px; background: var(--line-soft); color: var(--muted); }
.head__steps li.now { background: var(--ink); color: #fff; font-weight: 500; }
.head__steps li.done { background: var(--ok-soft); color: var(--ok); font-weight: 500; }
@media (max-width: 720px) {
  .head { padding: 10px 16px; }
  .head__steps { font-size: 12px; }
}
</style>

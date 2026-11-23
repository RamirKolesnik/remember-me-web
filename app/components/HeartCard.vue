<script setup lang="ts">
import { HEART, HEART_PRICE_FROM } from '~/shared/wall'

const emit = defineEmits<{ close: [] }>()
const price = `from $${HEART_PRICE_FROM.toLocaleString('en-US')}`
</script>

<template>
  <section class="heart" aria-label="The heart of the wall">
    <button type="button" class="heart__close btn btn--ghost btn--icon" aria-label="Close" @click="emit('close')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
    <div class="heart__top">
      <div class="heart__badge" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="#fff"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4h2c.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg>
      </div>
      <div class="heart__who">
        <span class="heart__tag">Legendary · one of one</span>
        <span class="heart__name">The heart of the wall</span>
        <span class="heart__price">{{ price }}</span>
      </div>
    </div>
    <p class="heart__note">
      The {{ HEART.size }}×{{ HEART.size }} block at the very center, where every visit begins.
      One owner, forever. The heart isn't sold on the site — it goes to one person, by arrangement.
    </p>
  </section>
</template>

<style scoped>
.heart {
  position: relative;
  width: 320px;
  max-width: 100%;
  background: var(--paper);
  border: 1px solid #F3C9A8;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 12px 32px rgba(216, 90, 48, 0.18);
}
.heart__close { position: absolute; top: 8px; right: 8px; border: 0; }
.heart__top { display: flex; gap: 14px; align-items: center; padding-right: 40px; }
.heart__badge {
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(60deg, #C2401E, #F08A2E, #FFD36B, #F08A2E, #C2401E);
  background-size: 300% 300%;
  animation: flow 5s ease-in-out infinite alternate;
  box-shadow: 0 0 24px rgba(240, 128, 40, 0.45);
}
@keyframes flow {
  from { background-position: 0% 50%; }
  to { background-position: 100% 50%; }
}
@media (prefers-reduced-motion: reduce) {
  .heart__badge { animation: none; }
}
.heart__who { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.heart__tag { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #C2401E; }
.heart__name { font-size: 17px; font-weight: 600; }
.heart__price { font-family: var(--font-display); font-size: 20px; font-weight: 600; color: var(--ink); }
.heart__note { margin: 0; font-size: 14px; line-height: 1.5; color: #2C2C2A; }
</style>

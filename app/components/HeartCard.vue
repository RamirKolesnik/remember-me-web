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
        <svg width="40" height="40" viewBox="0 0 24 24" fill="#FF3B52"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4h2c.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg>
      </div>
      <div class="heart__who">
        <span class="heart__tag">The heart · one of one</span>
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
  background: var(--panel);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 59, 82, 0.45);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 12px 40px rgba(255, 40, 70, 0.25);
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
  background: radial-gradient(circle at 50% 50%, #5A0F1E, #2A0710);
  border: 2px solid var(--heart);
  box-shadow: 0 0 24px rgba(255, 59, 82, 0.45);
}
.heart__badge svg { animation: beat 10s infinite; filter: drop-shadow(0 0 8px rgba(255, 59, 82, 0.7)); }
@keyframes beat {
  0%, 6%, 100% { transform: scale(1); }
  1.5% { transform: scale(1.18); }
  3.5% { transform: scale(1.07); }
}
@media (prefers-reduced-motion: reduce) {
  .heart__badge svg { animation: none; }
}
.heart__who { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.heart__tag { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--heart); }
.heart__name { font-size: 17px; font-weight: 600; }
.heart__price { font-family: var(--font-display); font-size: 20px; font-weight: 600; color: var(--ink); }
.heart__note { margin: 0; font-size: 14px; line-height: 1.5; color: var(--ink-2); }
</style>

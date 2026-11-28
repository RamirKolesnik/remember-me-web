<script setup lang="ts">
// A widget over the wall. On a desktop it is simply shown (framed as a panel
// if asked). On a phone it folds into a round icon; a tap opens it as a sheet
// from the bottom (or in place, for the search). One widget is open at a time.
// Its content stays mounted while folded, so the feed keeps listening.
const props = withDefaults(defineProps<{
  id: string
  label: string
  icon: 'search' | 'feed' | 'stats' | 'map' | 'globe'
  /** Desktop: draw a panel around the content. */
  framed?: boolean
  /** Phone: open as a bottom sheet (default) or in place. */
  sheet?: boolean
  /** Phone: a small count on the icon (new frames in the feed). */
  badge?: number
}>(), { framed: false, sheet: true, badge: 0 })

const mobile = useMobile()
const open = useState<string | null>('wall-widget', () => null)
const isOpen = computed(() => open.value === props.id)
const toggle = () => { open.value = isOpen.value ? null : props.id }
</script>

<template>
  <div v-if="!mobile" class="ww" :class="{ panel: framed, 'ww--framed': framed }">
    <slot />
  </div>
  <div v-else class="ww-m" :class="{ 'ww-m--open': isOpen, 'ww-m--inline': !sheet }">
    <button
      v-show="!isOpen"
      type="button"
      class="ww-m__fab panel"
      :aria-label="`Open ${label}`"
      :aria-expanded="false"
      @click="toggle"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <template v-if="icon === 'search'"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></template>
        <template v-else-if="icon === 'feed'"><path d="M3 12h4l2-5 4 10 2-5h6" /></template>
        <template v-else-if="icon === 'globe'"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" /></template>
        <template v-else-if="icon === 'stats'"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></template>
        <template v-else><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></template>
      </svg>
      <span v-if="badge" class="ww-m__badge">+{{ badge }}</span>
    </button>
    <section v-show="isOpen" class="ww-m__sheet panel" :aria-label="label">
      <header class="ww-m__head">
        <span>{{ label }}</span>
        <button type="button" class="ww-m__close" aria-label="Close" @click="toggle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>
      <div class="ww-m__body"><slot /></div>
    </section>
  </div>
</template>

<style scoped>
.ww--framed { padding: 12px; }
.ww-m__fab {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--ink);
}
.ww-m__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}
.ww-m__sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  max-height: 70dvh;
  display: flex;
  flex-direction: column;
  border-radius: 16px 16px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}
.ww-m--inline .ww-m__sheet {
  position: static;
  width: calc(100vw - 24px);
  max-height: none;
  border-radius: 12px;
  padding-bottom: 0;
}
.ww-m__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 6px 6px 16px;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid var(--line-soft);
}
.ww-m__close {
  width: 44px;
  height: 44px;
  border: 0;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.ww-m__body { overflow-y: auto; padding: 12px; min-height: 0; overscroll-behavior: contain; }
.ww-m--inline .ww-m__body { padding: 0; overflow: visible; }
</style>

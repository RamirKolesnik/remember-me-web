<script setup lang="ts">
// A widget over the wall. On a desktop it is shown (framed as a panel if
// asked), with a small button that slides it off the screen edge it sits by;
// then only its icon sticks out of the edge, and a click slides it back. On a phone it folds into a round icon; a tap opens it as a sheet
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
  /** Desktop: the screen edge the widget slides off to. */
  edge?: 'left' | 'right'
}>(), { framed: false, sheet: true, badge: 0, edge: 'right' })

const mobile = useMobile()
const open = useState<string | null>('wall-widget', () => null)
const isOpen = computed(() => open.value === props.id)
const toggle = () => { open.value = isOpen.value ? null : props.id }

// Desktop: slid off the screen or not. Content stays mounted either way.
// Hiding: the panel slides out past the edge while keeping its place, then
// its space shrinks smoothly to the tab. Showing: the tab goes, the space
// grows to the panel while it slides in. Neighbours move, but never jump.
const hiddenMap = useHiddenWidgets()
const hidden = computed(() => !!hiddenMap.value[props.id])
/** The tab sticks out of the edge (only once the panel has left). */
const tabShown = ref(false)
const box = ref<HTMLDivElement | null>(null)
const panelEl = ref<HTMLDivElement | null>(null)
const tabEl = ref<HTMLButtonElement | null>(null)
const still = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function setHidden(on: boolean) {
  hiddenMap.value = { ...hiddenMap.value, [props.id]: on }
  writeHidden(props.id, on)
}
onMounted(() => {
  if (!(props.id in hiddenMap.value)) hiddenMap.value = { ...hiddenMap.value, [props.id]: readHidden(props.id) }
  tabShown.value = hidden.value
})

/** Ease the box's height from what it is now to `to()`, measured after `change`. */
function resize(change: () => void, to: () => number) {
  const el = box.value
  if (!el || still()) { change(); el && (el.style.height = ''); return }
  el.style.height = `${el.offsetHeight}px`
  change()
  nextTick(() => {
    void el.offsetHeight
    el.style.transition = 'height 0.22s ease'
    el.style.height = `${to()}px`
    const done = (e?: TransitionEvent) => {
      if (e && (e.target !== el || e.propertyName !== 'height')) return
      el.style.height = ''
      el.style.transition = ''
      el.removeEventListener('transitionend', done)
    }
    el.addEventListener('transitionend', done)
    setTimeout(done, 400)
  })
}
// The panel keeps its space while it slides out; then the space shrinks to the tab.
function beforeLeave() {
  if (box.value) box.value.style.height = `${box.value.offsetHeight}px`
}
function afterLeave() {
  resize(() => { tabShown.value = true }, () => tabEl.value?.offsetHeight ?? 40)
}
function show() {
  resize(() => {
    tabShown.value = false
    setHidden(false)
  }, () => panelEl.value?.offsetHeight ?? 0)
}
// Hidden from elsewhere (Ctrl/Cmd+K brings the search back): no tab left behind.
watch(hidden, (h) => { if (!h && tabShown.value) show() })
const arrow = computed(() => (props.edge === 'right') !== hidden.value ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6')
</script>

<template>
  <div v-if="!mobile" ref="box" class="ww-d" :class="`ww-d--${edge}`">
    <Transition name="ww-slide" @before-leave="beforeLeave" @after-leave="afterLeave">
      <div v-show="!hidden" ref="panelEl" class="ww" :class="{ panel: framed, 'ww--framed': framed }">
        <slot />
        <button type="button" class="ww__hide" :aria-label="`Hide ${label}`" :title="`Hide ${label}`" @click="setHidden(true)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="arrow" /></svg>
        </button>
      </div>
    </Transition>
    <Transition name="ww-tab">
      <button v-show="tabShown" ref="tabEl" type="button" class="ww__tab panel" :aria-label="`Show ${label}`" :title="label" @click="show">
        <WidgetIcon :icon="icon" :size="18" />
      </button>
    </Transition>
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
      <WidgetIcon :icon="icon" />
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
/* --edge: how far the widget's column sits from the screen edge (set by the page). */
.ww-d { position: relative; display: flex; flex-direction: column; min-height: 0; }
.ww-d--right { align-items: flex-end; }
.ww-d--left { align-items: flex-start; }
/* A column, so a tall widget (the feed) can shrink and scroll inside. */
.ww { position: relative; display: flex; flex-direction: column; min-height: 0; }
/* The hide button: a small round button on the widget's corner by the edge. */
.ww__hide {
  position: absolute;
  top: -8px;
  z-index: 2;
  width: 22px;
  height: 22px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: var(--paper-2);
  color: var(--muted);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  opacity: 0.55;
  transition: opacity 0.15s, color 0.15s;
}
.ww-d--right .ww__hide { right: -8px; }
.ww-d--left .ww__hide { left: -8px; }
.ww:hover .ww__hide, .ww__hide:focus-visible { opacity: 1; }
.ww__hide:hover { color: var(--ink); border-color: var(--ink-2); }
/* The tab of a hidden widget: its icon, flush with the screen edge. */
.ww__tab {
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  cursor: pointer;
}
.ww__tab:hover { color: var(--accent); }
.ww-d--right .ww__tab { margin-right: calc(-1 * var(--edge, 16px)); border-right: 0; border-radius: 12px 0 0 12px; }
.ww-d--left .ww__tab { margin-left: calc(-1 * var(--edge, 16px)); border-left: 0; border-radius: 0 12px 12px 0; }
/* Sliding: the widget leaves past the edge, then its tab comes out of it. */
.ww-slide-enter-active, .ww-slide-leave-active { transition: transform 0.25s ease, opacity 0.25s ease; }
/* The box keeps its height while the panel slides; nothing spills out of it sideways. */
.ww-d { flex-shrink: 0; }
.ww-d--right .ww-slide-enter-from, .ww-d--right .ww-slide-leave-to { transform: translateX(calc(100% + var(--edge, 16px))); opacity: 0; }
.ww-d--left .ww-slide-enter-from, .ww-d--left .ww-slide-leave-to { transform: translateX(calc(-100% - var(--edge, 16px))); opacity: 0; }
/* The tab slides out of the edge once the panel is gone. */
.ww-tab-enter-active { transition: transform 0.2s ease; }
.ww-d--right .ww-tab-enter-from { transform: translateX(100%); }
.ww-d--left .ww-tab-enter-from { transform: translateX(-100%); }
@media (prefers-reduced-motion: reduce) {
  .ww-slide-enter-active, .ww-slide-leave-active, .ww-tab-enter-active { transition: none; }
}
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

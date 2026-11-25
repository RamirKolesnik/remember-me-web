<script setup lang="ts">
import { parseFrameNumber } from '~/shared/share'
import { zoneOfFrame, isHeart } from '~/shared/wall'
import { tierOf } from '~/shared/tiers'
import type { WallFrame } from '~/composables/useWall'

const props = defineProps<{
  /** Frame #n if the loaded wall has it: shown as you type. */
  preview: (n: number) => WallFrame | null
  /** Opens frame #n; false if there is no such frame. */
  find: (n: number) => Promise<boolean>
}>()

const input = ref<HTMLInputElement | null>(null)
const query = ref('')
const focused = ref(false)
const busy = ref(false)
const missed = ref<number | null>(null)

const n = computed(() => parseFrameNumber(query.value))
const match = computed(() => (n.value ? props.preview(n.value) : null))
const fmt = (v: number) => v.toLocaleString('en-US')
const open = computed(() => focused.value && query.value.trim() !== '')

watch(query, () => { missed.value = null })

// What the match row says under the name, and its zone swatch.
const matchInfo = computed(() => {
  const f = match.value
  if (!f) return null
  if (isHeart(f.x, f.y, f.size)) return { meta: 'The heart', color: 'var(--heart)' }
  const z = zoneOfFrame(f.x, f.y, f.size)
  return { meta: `in the ${tierOf(z.id).name}`, color: tierOf(z.id).accent }
})

const shortcut = ref('Ctrl K')

async function go() {
  if (!n.value || busy.value) return
  busy.value = true
  try {
    if (await props.find(n.value)) {
      query.value = ''
      input.value?.blur()
    } else {
      missed.value = n.value
    }
  } finally {
    busy.value = false
  }
}

function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    input.value?.focus()
    input.value?.select()
  }
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) shortcut.value = '⌘K'
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function onEscape() {
  if (query.value) query.value = ''
  else input.value?.blur()
}
</script>

<template>
  <div class="search">
    <form class="search__box" role="search" @submit.prevent="go">
      <svg class="search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
      <input
        ref="input"
        v-model="query"
        class="search__input"
        type="search"
        inputmode="numeric"
        autocomplete="off"
        placeholder="Find a frame by #"
        aria-label="Find a frame by its number"
        @focus="focused = true"
        @blur="focused = false"
        @keydown.esc.prevent="onEscape"
      >
      <kbd class="search__kbd" aria-hidden="true">{{ shortcut }}</kbd>
    </form>

    <div v-if="open" class="search__drop" @mousedown.prevent>
      <p v-if="!n" class="search__hint">Type the number from a story card, like <b>#4812</b>.</p>
      <p v-else-if="missed === n" class="search__hint">No frame #{{ fmt(n) }} on the wall yet.</p>
      <button v-else-if="match" type="button" class="search__hit" @click="go">
        <span class="search__avatar" :style="{ background: match.color, color: match.ink }">
          <img v-if="match.photoUrl" :src="match.photoUrl" alt="">
          <template v-else>{{ match.initials }}</template>
        </span>
        <span class="search__who">
          <span class="search__name">{{ match.name }}</span>
          <span class="search__meta">
            <i :style="{ background: matchInfo?.color }" />
            #{{ fmt(n) }} · {{ matchInfo?.meta }}
          </span>
        </span>
      </button>
      <button v-else type="button" class="search__hit search__hit--plain" :disabled="busy" @click="go">
        {{ busy ? 'Looking…' : `Go to frame #${fmt(n)}` }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.search { width: 260px; max-width: calc(100vw - 24px); }
.search__box {
  position: relative;
  display: flex;
  align-items: center;
  height: 44px;
  background: var(--panel);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.search__box:focus-within { border-color: var(--accent); }
.search__icon { position: absolute; left: 12px; color: var(--muted); pointer-events: none; }
.search__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 56px 0 36px;
  border: 0;
  background: transparent;
  outline: none;
  font-size: 14px;
}
.search__input::-webkit-search-cancel-button { display: none; }
.search__kbd {
  position: absolute;
  right: 10px;
  padding: 2px 6px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-family: var(--font);
  font-size: 11px;
  color: var(--muted);
  pointer-events: none;
}
.search__box:focus-within .search__kbd { display: none; }
.search__drop {
  margin-top: 6px;
  padding: 6px;
  background: var(--panel);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: var(--shadow);
}
.search__hint { margin: 0; padding: 8px 10px; font-size: 13px; color: var(--muted); }
.search__hint b { color: var(--ink); font-weight: 600; }
.search__hit {
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
.search__hit:hover, .search__hit:focus-visible { background: var(--paper-2); outline: none; }
.search__hit--plain { padding: 10px; font-size: 14px; font-weight: 500; }
.search__hit:disabled { cursor: progress; color: var(--muted); }
.search__avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 15px;
}
.search__avatar img { width: 100%; height: 100%; object-fit: cover; }
.search__who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.search__name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.search__meta { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--muted); }
.search__meta i { width: 8px; height: 8px; border-radius: 2px; }
@media (max-width: 720px) {
  .search { width: auto; max-width: none; }
  .search__kbd { display: none; }
}
</style>

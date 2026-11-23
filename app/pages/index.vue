<script setup lang="ts">
import { HEART } from '~/shared/wall'
import type { WallFrame } from '~/composables/useWall'
import type { WallView } from '~/components/WallCanvas.vue'

const { frames, frameAt, status, load, byId } = useWall()
const api = useApi()
const route = useRoute()
const wall = ref<{ zoomBy: (f: number) => void; centerOn: (x: number, y: number, s?: number) => void } | null>(null)
const selected = ref<WallFrame | null>(null)
const view = ref<WallView | null>(null)
const reported = ref<string | null>(null)
const heartOpen = ref(false)

onMounted(() => load())

// /?frame=123 opens the wall on that frame. The query is watched too: on a
// direct load it only appears after hydration.
watch([status, wall, () => route.query.frame], ([s, w, q]) => {
  const id = Number(q)
  if (s !== 'ready' || !w || !id) return
  const f = byId(id)
  if (!f) return
  w.centerOn(f.x + f.size / 2, f.y + f.size / 2, 24)
  selected.value = f
}, { immediate: true })

function onSelect(frame: WallFrame | null) {
  selected.value = frame
  heartOpen.value = false
  reported.value = null
}

async function onReport(frame: WallFrame) {
  if (api.live) {
    try {
      await api.post(`/frames/${frame.id}/reports`, {})
    } catch {
      reported.value = "Couldn't send the report. Try again later."
      return
    }
  }
  reported.value = `Thanks — the frame of ${frame.name} will be reviewed.`
}
</script>

<template>
  <div class="page">
    <SiteHeader />
    <main class="stage">
      <ClientOnly>
        <WallCanvas
          ref="wall"
          :frames="frames"
          :frame-at="frameAt"
          :selected-id="selected?.id ?? null"
          @select="onSelect"
          @heart="onSelect(null); heartOpen = true"
          @view="view = $event"
        />
      </ClientOnly>

      <WallStatus />

      <div class="controls">
        <button type="button" class="btn btn--ghost btn--icon" aria-label="Zoom in" @click="wall?.zoomBy(1.5)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button type="button" class="btn btn--ghost btn--icon" aria-label="Zoom out" @click="wall?.zoomBy(1 / 1.5)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
        </button>
        <button type="button" class="btn btn--ghost" @click="wall?.centerOn(HEART.x + HEART.size / 2, HEART.y + HEART.size / 2, 16)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
          <span class="controls__label">Back to the heart</span>
        </button>
      </div>

      <div class="side">
        <WallStats />
        <WallMinimap :view="view" @jump="wall?.centerOn($event.x, $event.y)" />
      </div>

      <div v-if="heartOpen" class="selected">
        <HeartCard @close="heartOpen = false" />
      </div>
      <div v-else-if="selected" class="selected">
        <FrameCard :frame="selected" @close="onSelect(null)" @report="onReport" />
        <p v-if="reported" class="selected__toast" role="status">{{ reported }}</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page { height: 100dvh; display: flex; flex-direction: column; }
.stage { position: relative; flex: 1; min-height: 0; }
.controls {
  position: absolute;
  left: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.side {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.selected {
  position: absolute;
  top: 72px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  z-index: 2;
}
.selected__toast {
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--ink);
  color: #fff;
  font-size: 13px;
  max-width: 320px;
}
@media (max-width: 720px) {
  .side { display: none; }
  .controls__label { display: none; }
  .selected {
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    align-items: stretch;
  }
  .selected :deep(.card), .selected :deep(.heart) {
    width: 100%;
    border-radius: 16px 16px 0 0;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
  .selected__toast { margin: 0 16px 8px; order: -1; }
}
</style>

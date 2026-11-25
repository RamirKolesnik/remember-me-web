<script setup lang="ts">
import { isHeart } from '~/shared/wall'
import { frameLink, shareText, storyFileName } from '~/shared/share'
import type { WallFrame } from '~/composables/useWall'

const props = defineProps<{ frame: WallFrame; storyUrl: string }>()

const config = useRuntimeConfig()
const link = ref('')
const text = computed(() => shareText({ number: props.frame.number, isHeart: isHeart(props.frame.x, props.frame.y, props.frame.size) }))

// The picture is fetched once as a file: the preview, the download and the
// share sheet all use it. iOS only opens the share sheet straight from a tap,
// so the file has to be ready before the tap.
const file = shallowRef<File | null>(null)
const preview = ref('')
const imageState = ref<'loading' | 'ready' | 'error'>('loading')
const canShare = ref(false)
const canShareFile = ref(false)
const copied = ref(false)
const note = ref('')

async function loadImage(attempt = 0) {
  imageState.value = 'loading'
  try {
    const res = await fetch(props.storyUrl)
    // The server is still drawing other cards: try again shortly.
    if (res.status === 503 && attempt < 5) {
      setTimeout(() => loadImage(attempt + 1), 2000)
      return
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    file.value = new File([blob], storyFileName(props.frame.id), { type: blob.type || 'image/jpeg' })
    if (preview.value) URL.revokeObjectURL(preview.value)
    preview.value = URL.createObjectURL(blob)
    canShareFile.value = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file.value] })
    imageState.value = 'ready'
  } catch (err) {
    console.error('Loading the story card failed', err)
    imageState.value = 'error'
  }
}

onMounted(() => {
  link.value = frameLink(window.location.origin, config.app.baseURL, props.frame)
  canShare.value = typeof navigator.share === 'function'
  loadImage()
})
onBeforeUnmount(() => { if (preview.value) URL.revokeObjectURL(preview.value) })

async function share() {
  note.value = ''
  try {
    if (file.value && canShareFile.value) {
      // The picture alone: with extra text, iOS hides "Instagram Stories" from the share sheet.
      await navigator.share({ files: [file.value] })
    } else {
      await navigator.share({ title: 'The Living Wall', text: text.value, url: link.value })
    }
  } catch (err) {
    if ((err as DOMException).name !== 'AbortError') note.value = 'Sharing didn’t work here. Download the picture instead.'
  }
}

function download() {
  if (!preview.value) return
  const a = document.createElement('a')
  a.href = preview.value
  a.download = storyFileName(props.frame.id)
  document.body.appendChild(a)
  a.click()
  a.remove()
}

let copiedTimer: ReturnType<typeof setTimeout> | undefined
async function copy() {
  try {
    await navigator.clipboard.writeText(link.value)
  } catch {
    // Older browsers and some in-app browsers: select the text so it can be copied by hand.
    const input = document.getElementById('share-link') as HTMLInputElement | null
    input?.select()
    note.value = 'Press Ctrl+C (⌘C) to copy the link.'
    return
  }
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="share">
    <figure class="share__story">
      <img v-if="imageState === 'ready'" :src="preview" :alt="`Story card: ${frame.name}. ${text}`">
      <div v-else-if="imageState === 'loading'" class="share__ph" role="status">
        <span class="share__spin" aria-hidden="true" />
        Drawing your card…
      </div>
      <div v-else class="share__ph">
        The card didn’t load.
        <button type="button" class="btn btn--ghost" @click="loadImage()">Try again</button>
      </div>
    </figure>

    <div class="share__side">
      <p class="share__lead">Tell the world. Post your card to Stories and let friends find you on the wall.</p>

      <div class="share__actions">
        <button v-if="canShare" type="button" class="btn btn--lg" :disabled="imageState === 'loading'" @click="share">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
          Share
        </button>
        <button type="button" :class="['btn', 'btn--lg', canShare ? 'btn--ghost' : '']" :disabled="imageState !== 'ready'" @click="download">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
          Download image
        </button>
      </div>

      <div class="field">
        <label class="field__label" for="share-link">Link to your frame</label>
        <div class="share__link">
          <input id="share-link" class="input" type="text" readonly :value="link" @focus="($event.target as HTMLInputElement).select()">
          <button type="button" class="btn btn--ghost" @click="copy">{{ copied ? 'Copied' : 'Copy link' }}</button>
        </div>
        <span class="sr-only" aria-live="polite">{{ copied ? 'Link copied' : '' }}</span>
      </div>

      <p v-if="note" class="share__note" role="status">{{ note }}</p>
      <p class="share__hint">
        <template v-if="canShare">Tap Share and pick Instagram or TikTok, or save the picture and add it to your story.</template>
        <template v-else>Download the picture, send it to your phone and add it to your story.</template>
      </p>
    </div>
  </div>
</template>

<style scoped>
.share {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 32px;
  align-items: start;
  width: 100%;
}
.share__story {
  margin: 0;
  aspect-ratio: 9 / 16;
  border-radius: 16px;
  overflow: hidden;
  background: var(--paper);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
}
.share__story img { display: block; width: 100%; height: 100%; object-fit: cover; }
.share__ph {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}
.share__spin {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid var(--line);
  border-top-color: var(--accent);
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .share__spin { animation-duration: 3s; } }

.share__side { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.share__lead { margin: 0; font-size: 17px; line-height: 1.5; }
.share__actions { display: flex; flex-wrap: wrap; gap: 12px; }
.share__link { display: flex; gap: 8px; }
.share__link .input { flex: 1; min-width: 0; font-size: 14px; color: var(--ink-2); }
.share__note { margin: 0; font-size: 14px; color: var(--danger); }
.share__hint { margin: 0; font-size: 13px; color: var(--muted); line-height: 1.5; }

@media (max-width: 640px) {
  .share { grid-template-columns: 1fr; gap: 24px; }
  .share__story { width: min(260px, 70vw); justify-self: center; }
  .share__actions .btn { flex: 1; }
}
</style>

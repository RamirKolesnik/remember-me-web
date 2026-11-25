<script setup lang="ts">
import { containsLink, formatUsd, NAME_MAX, NOTE_MAX, ZONES } from '~/shared/wall'
import { tierOf } from '~/shared/tiers'
import { squarePhoto } from '~/composables/useDraft'
import { ApiError } from '~/composables/useApi'

useHead({ title: 'Immortalize yourself — remember.me' })

const draft = useDraft()
const photoState = ref<'empty' | 'checking' | 'ok' | 'error'>(draft.value.photo ? 'ok' : 'empty')
const photoError = ref('')
const touched = reactive({ name: false, note: false })

const noteHasLink = computed(() => containsLink(draft.value.note))
const nameError = computed(() => {
  const n = draft.value.name.trim()
  if (!n) return 'Add a name'
  if (containsLink(n)) return "Links aren't allowed"
  return ''
})
const noteError = computed(() => (noteHasLink.value ? "Links aren't allowed — an @handle is fine." : ''))
const ready = computed(() => photoState.value === 'ok' && (!api.live || !!draft.value.photoKey) &&
  !nameError.value && !noteError.value)

const MAX_BYTES = 10 * 1024 * 1024
const api = useApi()

const PHOTO_ERRORS: Record<string, string> = {
  rejected_by_moderation: "This photo didn't pass moderation. Try another one.",
  too_large: 'That image is too large.',
  not_an_image: "That file doesn't look like an image.",
}

async function onPhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  photoError.value = ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    photoState.value = 'error'
    photoError.value = 'Use a JPG, PNG or WebP image.'
    return
  }
  if (file.size > MAX_BYTES) {
    photoState.value = 'error'
    photoError.value = 'The image is over 10 MB.'
    return
  }
  photoState.value = 'checking'
  draft.value.photoKey = null
  try {
    const dataUrl = await squarePhoto(file)
    draft.value.photo = dataUrl
    if (api.live) {
      const res = await api.post<{ photoKey: string }>('/photos', { dataUrl })
      draft.value.photoKey = res.photoKey
    } else {
      await new Promise((r) => setTimeout(r, 500)) // demo: every photo passes
    }
    photoState.value = 'ok'
  } catch (err) {
    photoState.value = 'error'
    const code = err instanceof ApiError ? String(err.body.error ?? '') : ''
    photoError.value = PHOTO_ERRORS[code] ?? "Couldn't upload the photo. Try again."
  }
}

function next() {
  touched.name = true
  touched.note = true
  if (!ready.value) return
  navigateTo('/immortalize/spot')
}

const initials = computed(() => draft.value.name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?')
</script>

<template>
  <div class="page">
    <SiteHeader :step="1" />
    <main class="main">
      <form class="form" novalidate @submit.prevent="next">
        <div class="intro">
          <h1>Immortalize yourself</h1>
          <p>Your frame stays on the wall forever and can't be edited later — take a second to get it right.</p>
        </div>

        <div class="field">
          <label class="field__label" for="photo">Photo</label>
          <div class="photo">
            <div class="photo__preview">
              <img v-if="draft.photo" :src="draft.photo" alt="Your photo, cropped to a square">
              <span v-else aria-hidden="true">{{ initials }}</span>
            </div>
            <div class="photo__side">
              <span v-if="photoState === 'ok'" class="pill pill--ok">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
                Passed moderation
              </span>
              <span v-else-if="photoState === 'checking'" class="pill pill--wait" role="status">Checking…</span>
              <span v-else-if="photoState === 'error'" class="pill pill--danger" role="alert">{{ photoError }}</span>
              <span class="field__hint">Square crop, JPG, PNG or WebP up to 5 MB. Checked the moment you upload.</span>
              <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" class="photo__input" @change="onPhoto">
            </div>
          </div>
        </div>

        <div class="field">
          <label class="field__label" for="name">Name</label>
          <input
            id="name"
            v-model="draft.name"
            class="input"
            :class="{ 'input--invalid': touched.name && nameError }"
            type="text"
            :maxlength="NAME_MAX"
            autocomplete="name"
            @blur="touched.name = true"
          >
          <span v-if="touched.name && nameError" class="field__error">{{ nameError }}</span>
        </div>

        <div class="field">
          <div class="field__row">
            <label class="field__label" for="note">Note</label>
            <span class="field__hint">{{ draft.note.length }} / {{ NOTE_MAX }}</span>
          </div>
          <textarea
            id="note"
            v-model="draft.note"
            class="input"
            :class="{ 'input--invalid': noteError }"
            rows="4"
            :maxlength="NOTE_MAX"
            @blur="touched.note = true"
          />
          <span v-if="noteError" class="field__error">{{ noteError }}</span>
          <span v-else class="field__hint">A quote, a hello, your @handle. Links aren't allowed.</span>
        </div>

        <div class="field">
          <span class="field__label">Price</span>
          <ul class="prices">
            <li v-for="z in ZONES" :key="z.id" class="price">
              <i class="price__swatch" :style="{ background: tierOf(z.id).accent }" />
              <span class="price__name">{{ tierOf(z.id).name }}</span>
              <span class="price__value">{{ formatUsd(z.priceCents) }}</span>
            </li>
          </ul>
          <span class="field__hint">Every frame is one cell. The price depends on the zone — closer to the heart costs more.</span>
        </div>

        <button type="submit" class="btn btn--lg next" :aria-disabled="!ready">
          Choose your spot
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
        <span v-if="!ready && touched.name && photoState !== 'ok'" class="field__error">Add a photo to continue.</span>
      </form>

      <aside class="aside">
        <span class="aside__label">How people will see it</span>
        <div class="preview">
          <div class="preview__top">
            <div class="preview__avatar">
              <img v-if="draft.photo" :src="draft.photo" alt="">
              <span v-else>{{ initials }}</span>
            </div>
            <div class="preview__who">
              <span class="preview__name">{{ draft.name || 'Your name' }}</span>
              <span class="preview__meta">Zone set in step 2</span>
            </div>
          </div>
          <p class="preview__note">{{ draft.note || 'Your note will appear here.' }}</p>
        </div>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.main {
  max-width: 1120px;
  margin: 0 auto;
  padding: 40px 24px 64px;
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  align-items: flex-start;
}
.form { flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 28px; }
.intro h1 { margin: 0 0 8px; font-family: var(--font-display); font-size: 36px; font-weight: 600; letter-spacing: -0.02em; }
.intro p { margin: 0; color: var(--muted); font-size: 16px; line-height: 1.5; }
.field__row { display: flex; justify-content: space-between; align-items: baseline; }
.photo {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
}
.photo__preview {
  width: 96px;
  height: 96px;
  border-radius: 10px;
  background: #C9C3F0;
  color: #3C3489;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 600;
  overflow: hidden;
  flex-shrink: 0;
}
.photo__preview img, .preview__avatar img { width: 100%; height: 100%; object-fit: cover; }
.photo__side { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; flex: 1; min-width: 200px; }
.photo__input { font-size: 13px; color: var(--muted); max-width: 100%; }
.prices { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.price {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid #D3D1C7;
  border-radius: 12px;
  background: var(--paper);
}
.price__swatch { width: 12px; height: 12px; border-radius: 3px; }
.price__name { font-size: 13px; color: var(--muted); }
.price__value { font-family: var(--font-display); font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.next { align-self: flex-start; }
.aside { flex: 1 1 300px; display: flex; flex-direction: column; gap: 12px; position: sticky; top: 24px; }
.aside__label { font-size: 13px; font-weight: 500; color: var(--muted); }
.preview {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.preview__top { display: flex; gap: 12px; align-items: center; }
.preview__avatar {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  background: #C9C3F0;
  color: #3C3489;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  overflow: hidden;
  flex-shrink: 0;
}
.preview__who { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.preview__name { font-size: 16px; font-weight: 600; overflow-wrap: anywhere; }
.preview__meta { font-size: 12px; color: var(--muted); }
.preview__note { margin: 0; font-size: 14px; line-height: 1.5; color: #2C2C2A; overflow-wrap: anywhere; white-space: pre-line; }
@media (max-width: 720px) {
  .main { padding: 24px 16px 48px; gap: 28px; }
  .intro h1 { font-size: 28px; }
  .prices { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .next { align-self: stretch; }
  .aside { position: static; }
}
</style>

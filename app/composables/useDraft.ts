import type { FrameSize } from '~/shared/wall'

export interface Draft {
  name: string
  note: string
  /** Data URL of the square, resized photo shown in previews. */
  photo: string | null
  /** Key of the uploaded photo on the API (live mode only). */
  photoKey: string | null
  size: FrameSize
}

const STORAGE_KEY = 'rm-draft'
let restored = false

/**
 * The frame being bought, shared between the purchase steps. Kept in
 * sessionStorage too, so it survives the trip to the checkout page and back.
 */
export function useDraft() {
  const draft = useState<Draft>('draft', () => ({
    name: '', note: '', photo: null, photoKey: null, size: 2,
  }))
  if (import.meta.client && !restored) {
    restored = true
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) draft.value = { ...draft.value, ...JSON.parse(saved) }
    } catch { /* storage unavailable: keep the in-memory draft */ }
    watch(draft, (d) => {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch { /* full or blocked */ }
    }, { deep: true })
  }
  return draft
}

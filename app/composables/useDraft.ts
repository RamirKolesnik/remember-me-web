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

/** Crops an image file to a centered square and returns a JPEG data URL. */
export async function squarePhoto(file: File, side = 512): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const s = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = side
  canvas.height = side
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, (bitmap.width - s) / 2, (bitmap.height - s) / 2, s, s, 0, 0, side, side)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.86)
}

import type { FrameSize } from '~/shared/wall'

export interface Draft {
  name: string
  note: string
  photo: string | null
  size: FrameSize
  moderated: boolean
}

/** The frame being bought, shared between the purchase steps. */
export function useDraft() {
  return useState<Draft>('draft', () => ({
    name: '', note: '', photo: null, size: 2, moderated: false,
  }))
}

// How tags look on the site and what the wall's filter shows. The rules of
// which frame gets which tag are in wall.ts (tagsOf), shared with the API.
// Keep the colours in step with TAG_COLOR in the API's story.ts.
import { isHeart, tagsOf, zoneOfFrame, type Milestones, type TagId, type ZoneId } from './wall.ts'
import { tierOf } from './tiers.ts'

export const TAG_STYLE: Record<TagId, { color: string; icon: string; plural: string }> = {
  'founder': { color: '#FF3B52', icon: '★', plural: 'Founders' },
  'first-wave': { color: '#5ED3C4', icon: '≈', plural: 'First wave' },
  'first-in-zone': { color: '#8BDB96', icon: '▲', plural: 'First in each zone' },
  'last-spot': { color: '#FF9F43', icon: '■', plural: 'Last spots' },
  'lucky': { color: '#FFD27A', icon: '✦', plural: 'Lucky numbers' },
  'heart-neighbour': { color: '#FF8FA2', icon: '♡', plural: 'Heart neighbours' },
}

/** What the wall is filtered by: a zone, or a tag. */
export type WallFilter = { kind: 'zone'; id: ZoneId } | { kind: 'tag'; id: TagId }

interface Framed { number: number | null; x: number; y: number; size: number }

export function matchesFilter(f: Framed, filter: WallFilter, m: Milestones | null): boolean {
  if (filter.kind === 'zone') return !isHeart(f.x, f.y, f.size) && zoneOfFrame(f.x, f.y, f.size).id === filter.id
  return tagsOf(f, m).some((t) => t.id === filter.id)
}

export function filterLabel(filter: WallFilter): string {
  return filter.kind === 'zone' ? `The ${tierOf(filter.id).name}` : TAG_STYLE[filter.id].plural
}

export function filterColor(filter: WallFilter): string {
  return filter.kind === 'zone' ? tierOf(filter.id).accent : TAG_STYLE[filter.id].color
}

/** The cells that hold all the matches, to fit them on screen; null when there are none. */
export function boundsOf(frames: readonly Framed[]): { x0: number; y0: number; x1: number; y1: number } | null {
  if (!frames.length) return null
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const f of frames) {
    x0 = Math.min(x0, f.x); y0 = Math.min(y0, f.y)
    x1 = Math.max(x1, f.x + f.size - 1); y1 = Math.max(y1, f.y + f.size - 1)
  }
  return { x0, y0, x1, y1 }
}

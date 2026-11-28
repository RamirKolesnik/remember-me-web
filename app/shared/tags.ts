// How tags look on the site and what the wall's filter shows. The rules of
// which frame gets which tag are in wall.ts (tagsOf), shared with the API.
// Keep the colours in step with TAG_COLOR in the API's story.ts.
import { tagsOf, type Milestones, type TagId } from './wall.ts'

export const TAG_STYLE: Record<TagId, { color: string; icon: string; plural: string }> = {
  'founder': { color: '#FF3B52', icon: '★', plural: 'Founders' },
  'first-wave': { color: '#5ED3C4', icon: '≈', plural: 'First wave' },
  'first-in-zone': { color: '#8BDB96', icon: '▲', plural: 'First in zone' },
  'last-spot': { color: '#FF9F43', icon: '■', plural: 'Last spots' },
  'lucky': { color: '#FFD27A', icon: '✦', plural: 'Lucky numbers' },
  'heart-neighbour': { color: '#FF8FA2', icon: '♡', plural: 'Heart neighbours' },
}

/**
 * Tags the wall can be filtered by, in the filter bar's order. Zones have
 * their own switch, and "First wave" is every frame until wave 2 opens.
 */
export const FILTER_TAGS: readonly TagId[] = ['founder', 'lucky', 'heart-neighbour', 'first-in-zone', 'last-spot']

export const isFilterTag = (id: TagId): boolean => FILTER_TAGS.includes(id)

/** The filter's rim on the wall: one bright yellow for every tag. */
export const SPOTLIGHT_COLOR = '#FFE14D'

interface Framed { number: number | null; x: number; y: number; size: number }

/** Frames with each filter tag, counted in one pass over the wall. */
export function tagCounts(frames: readonly Framed[], m: Milestones | null): Record<TagId, number> {
  const counts = Object.fromEntries(Object.keys(TAG_STYLE).map((k) => [k, 0])) as Record<TagId, number>
  for (const f of frames) for (const t of tagsOf(f, m)) counts[t.id]++
  return counts
}

export const hasTag = (f: Framed, id: TagId, m: Milestones | null): boolean => tagsOf(f, m).some((t) => t.id === id)

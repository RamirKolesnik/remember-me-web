// Rules of the wall. The backend keeps an identical copy and is the source of
// truth for prices; the frontend uses this module only to show them.

export const WALL_SIZE = 1000
export const BASE_FEE = 2
/**
 * The heart of the wall: a 4x4 block right at the center (cells 498..501).
 * One buyer, sold in person rather than on the site, from HEART_PRICE_FROM.
 */
export const HEART = { x: 498, y: 498, size: 4 } as const
export const HEART_PRICE_FROM = 10_000
export const NOTE_MAX = 280
export const NAME_MAX = 40
export const CELL_PX = 40

export type FrameSize = 1 | 2 | 3
export const FRAME_SIZES: readonly FrameSize[] = [1, 2, 3]

export interface Zone {
  id: 1 | 2 | 3 | 4
  min: number
  max: number
  multiplier: number
}

// Nested squares around the center, most expensive first.
export const ZONES: readonly Zone[] = [
  { id: 1, min: 450, max: 549, multiplier: 5 },
  { id: 2, min: 350, max: 649, multiplier: 3 },
  { id: 3, min: 200, max: 799, multiplier: 2 },
  { id: 4, min: 0, max: WALL_SIZE - 1, multiplier: 1 },
]

export function zoneOfCell(x: number, y: number): Zone {
  for (const z of ZONES) {
    if (x >= z.min && x <= z.max && y >= z.min && y <= z.max) return z
  }
  return ZONES[ZONES.length - 1]!
}

/** A frame that touches several zones is priced by the most expensive one. */
export function zoneOfFrame(x: number, y: number, size: FrameSize): Zone {
  let best = zoneOfCell(x, y)
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const z = zoneOfCell(x + i, y + j)
      if (z.id < best.id) best = z
    }
  }
  return best
}

export function isInsideWall(x: number, y: number, size: FrameSize): boolean {
  return Number.isInteger(x) && Number.isInteger(y) &&
    x >= 0 && y >= 0 && x + size <= WALL_SIZE && y + size <= WALL_SIZE
}

/** Does a size x size frame at (x, y) touch any cell of the heart? */
export function overlapsHeart(x: number, y: number, size: number): boolean {
  return x < HEART.x + HEART.size && x + size > HEART.x &&
    y < HEART.y + HEART.size && y + size > HEART.y
}

export function isHeartCell(x: number, y: number): boolean {
  return overlapsHeart(x, y, 1)
}

/** The heart frame itself: exactly the 4x4 block. */
export function isHeart(x: number, y: number, size: number): boolean {
  return x === HEART.x && y === HEART.y && size === HEART.size
}

export type PlacementError = 'out_of_bounds' | 'heart_not_for_sale'

export function placementError(x: number, y: number, size: FrameSize): PlacementError | null {
  if (!isInsideWall(x, y, size)) return 'out_of_bounds'
  if (overlapsHeart(x, y, size)) return 'heart_not_for_sale'
  return null
}

export function basePrice(size: FrameSize): number {
  return BASE_FEE + size * size
}

/** Price in whole US dollars. */
export function priceOf(x: number, y: number, size: FrameSize): number {
  return basePrice(size) * zoneOfFrame(x, y, size).multiplier
}

const TLDS = 'com|net|org|io|ru|uz|me|co|app|dev|xyz|info|link|ly|gg|tv|ai|site|online|store|shop|biz|us|uk|de|fr|kz|ua|by|to|cc|so|in|eu|page|live|club|pro|top'
const LINK_PATTERNS: readonly RegExp[] = [
  /https?:\/\//i,
  /\bwww\s*\./i,
  new RegExp(`\\b[a-z0-9-]{2,}\\s*(?:\\.|\\(dot\\)|\\[dot\\]|\\sdot\\s)\\s*(?:${TLDS})\\b`, 'i'),
]

/** True when the text holds a link. Bare @handles are allowed and ignored. */
export function containsLink(text: string): boolean {
  const withoutHandles = text.replace(/@[\w.]+/g, ' ')
  return LINK_PATTERNS.some((re) => re.test(withoutHandles))
}

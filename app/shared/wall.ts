// Rules of the wall. The backend keeps an identical copy and is the source of
// truth for prices; the frontend uses this module only to show them.

export const WALL_SIZE = 1000
/**
 * The heart of the wall: a 4x4 block right at the center (cells 498..501).
 * One buyer, sold in person rather than on the site, from HEART_PRICE_FROM.
 */
export const HEART = { x: 498, y: 498, size: 4 } as const
export const HEART_PRICE_FROM = 10_000
export const NOTE_MAX = 280
export const NAME_MAX = 40
/** One cell at 100% zoom. Every frame on sale is a single cell. */
export const CELL_PX = 80

/** Frames on sale are always 1x1; only the heart is bigger. */
export type FrameSize = 1
export const FRAME_SIZE: FrameSize = 1

export interface Zone {
  id: 1 | 2 | 3 | 4
  min: number
  max: number
  /** Price of one frame here, in US cents. */
  priceCents: number
}

// Nested squares around the center, most expensive first.
export const ZONES: readonly Zone[] = [
  { id: 1, min: 450, max: 549, priceCents: 9900 },
  { id: 2, min: 350, max: 649, priceCents: 2499 },
  { id: 3, min: 200, max: 799, priceCents: 999 },
  { id: 4, min: 0, max: WALL_SIZE - 1, priceCents: 499 },
]

export function zoneOfCell(x: number, y: number): Zone {
  for (const z of ZONES) {
    if (x >= z.min && x <= z.max && y >= z.min && y <= z.max) return z
  }
  return ZONES[ZONES.length - 1]!
}

/** A block that touches several zones belongs to the most expensive one. */
export function zoneOfFrame(x: number, y: number, size: number): Zone {
  let best = zoneOfCell(x, y)
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const z = zoneOfCell(x + i, y + j)
      if (z.id < best.id) best = z
    }
  }
  return best
}

export function isInsideWall(x: number, y: number, size: number = FRAME_SIZE): boolean {
  return Number.isInteger(x) && Number.isInteger(y) &&
    x >= 0 && y >= 0 && x + size <= WALL_SIZE && y + size <= WALL_SIZE
}

/** Does a size x size block at (x, y) touch any cell of the heart? */
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

/** Can a frame go on the cell (x, y)? */
export function placementError(x: number, y: number): PlacementError | null {
  if (!isInsideWall(x, y)) return 'out_of_bounds'
  if (isHeartCell(x, y)) return 'heart_not_for_sale'
  return null
}

/** Price of the frame on cell (x, y), in US cents. */
export function priceOf(x: number, y: number): number {
  return zoneOfCell(x, y).priceCents
}

/** "$4.99", "$99", "$10,000". */
export function formatUsd(cents: number): string {
  const whole = cents % 100 === 0
  return '$' + (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })
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

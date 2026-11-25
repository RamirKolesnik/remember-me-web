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

export type ZoneId = 1 | 2 | 3 | 4

export interface Zone {
  id: ZoneId
  min: number
  max: number
  /** The wave that opens this zone for sale (see WAVES). */
  wave: 1 | 2 | 3
  /** Frames this zone holds: its ring of cells, minus the heart. */
  capacity: number
  /**
   * Price in US cents, step by step. The zone moves one step up each time
   * another fifth of it is sold, so early buyers pay the least.
   */
  stepsCents: readonly number[]
}

// Nested squares around the center, most expensive first.
export const ZONES: readonly Zone[] = [
  { id: 1, min: 450, max: 549, wave: 1, capacity: 100 * 100 - 16, stepsCents: [2900, 3900, 4900, 6900, 9900] },
  { id: 2, min: 350, max: 649, wave: 1, capacity: 300 * 300 - 100 * 100, stepsCents: [299, 399, 499, 699, 999] },
  { id: 3, min: 200, max: 799, wave: 2, capacity: 600 * 600 - 300 * 300, stepsCents: [199, 249, 299, 349, 399] },
  { id: 4, min: 0, max: WALL_SIZE - 1, wave: 3, capacity: WALL_SIZE * WALL_SIZE - 600 * 600, stepsCents: [149, 199, 249, 299, 349] },
]

/** The wall opens from the center out. A wave opens once the one before it is this far sold. */
export const WAVE_UNLOCK_SHARE = 0.5
/** The first frames to go live are founders: #1 to #FOUNDERS. */
export const FOUNDERS = 1000

export const isFounder = (number: number | null | undefined): boolean =>
  typeof number === 'number' && number >= 1 && number <= FOUNDERS

/** Frames sold so far in each zone (hidden ones still count: their cells stay taken). */
export type Sold = Readonly<Record<ZoneId, number>>
export const NOTHING_SOLD: Sold = { 1: 0, 2: 0, 3: 0, 4: 0 }

export interface ZonePrice {
  zone: Zone
  open: boolean
  sold: number
  /** Index into zone.stepsCents. */
  step: number
  priceCents: number
  /** Price after the next step up; null on the last step. */
  nextPriceCents: number | null
  /** Frames left at the current price (on the last step: frames left at all). */
  leftAtPrice: number
}

export interface Wave {
  n: 1 | 2 | 3
  zones: ZoneId[]
  open: boolean
  sold: number
  capacity: number
  /** Frames this wave must sell before the next one opens. */
  unlockAt: number
}

export interface Pricing {
  zones: ZonePrice[]
  waves: Wave[]
  /** Frames on the wall, all zones together. */
  totalSold: number
  foundersLeft: number
}

/** Where prices and waves stand, from how many frames each zone has sold. */
export function pricing(sold: Sold): Pricing {
  const waves: Wave[] = []
  for (const n of [1, 2, 3] as const) {
    const zs = ZONES.filter((z) => z.wave === n)
    const capacity = zs.reduce((s, z) => s + z.capacity, 0)
    const done = zs.reduce((s, z) => s + Math.min(sold[z.id] ?? 0, z.capacity), 0)
    const before = waves[n - 2]
    const open = !before || (before.open && before.sold >= before.unlockAt)
    waves.push({ n, zones: zs.map((z) => z.id), open, sold: done, capacity, unlockAt: Math.ceil(capacity * WAVE_UNLOCK_SHARE) })
  }
  const zones = ZONES.map((zone): ZonePrice => {
    const n = Math.min(Math.max(sold[zone.id] ?? 0, 0), zone.capacity)
    const steps = zone.stepsCents.length
    const step = Math.min(steps - 1, Math.floor((n * steps) / zone.capacity))
    const last = step === steps - 1
    const nextAt = last ? zone.capacity : Math.ceil(((step + 1) * zone.capacity) / steps)
    return {
      zone,
      open: waves[zone.wave - 1]!.open,
      sold: n,
      step,
      priceCents: zone.stepsCents[step]!,
      nextPriceCents: last ? null : zone.stepsCents[step + 1]!,
      leftAtPrice: nextAt - n,
    }
  })
  const totalSold = zones.reduce((s, z) => s + z.sold, 0)
  return { zones, waves, totalSold, foundersLeft: Math.max(0, FOUNDERS - totalSold) }
}

export const zonePrice = (p: Pricing, id: ZoneId): ZonePrice => p.zones[id - 1]!

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

/** Price of the frame on cell (x, y) right now, in US cents. */
export function priceOf(x: number, y: number, p: Pricing): number {
  return zonePrice(p, zoneOfCell(x, y).id).priceCents
}

/** Is the zone of cell (x, y) open for sale yet? */
export function isOpenCell(x: number, y: number, p: Pricing): boolean {
  return zonePrice(p, zoneOfCell(x, y).id).open
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

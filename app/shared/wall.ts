// Rules of the wall. The backend keeps an identical copy and is the source of
// truth for prices; the frontend uses this module only to show them.

/**
 * 1002x1002 cells: an even side, so the 12x12 heart sits exactly in the
 * middle, and still over a million frames around it (1,003,860).
 */
export const WALL_SIZE = 1002
/**
 * The heart of the wall: a 12x12 block right at the center (cells 495..506).
 * One buyer, sold in person rather than on the site, from HEART_PRICE_FROM.
 */
export const HEART = { x: 495, y: 495, size: 12 } as const
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

// Nested squares around the center (100, 300 and 600 cells wide, then the
// whole wall), most expensive first.
export const ZONES: readonly Zone[] = [
  { id: 1, min: 451, max: 550, wave: 1, capacity: 100 * 100 - 12 * 12, stepsCents: [2900, 3900, 4900, 6900, 9900] },
  { id: 2, min: 351, max: 650, wave: 1, capacity: 300 * 300 - 100 * 100, stepsCents: [299, 399, 499, 699, 999] },
  { id: 3, min: 201, max: 800, wave: 2, capacity: 600 * 600 - 300 * 300, stepsCents: [199, 249, 299, 349, 399] },
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

/** The heart frame itself: exactly the 12x12 block. */
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

// Tags: small badges on a frame's card, story card and the wall's filter.
// Founder, lucky numbers and heart neighbours follow from the frame alone;
// first wave, first in zone and last spot need the wall's milestones.

/** The 52 single cells that touch the heart, corners included. */
export const HEART_NEIGHBOURS = (HEART.size + 2) ** 2 - HEART.size ** 2

export function isHeartNeighbour(x: number, y: number, size: number): boolean {
  return size === 1 && !isHeartCell(x, y) &&
    x >= HEART.x - 1 && x <= HEART.x + HEART.size && y >= HEART.y - 1 && y <= HEART.y + HEART.size
}

export type LuckyKind = 'one' | 'repdigit' | 'round' | 'straight'

/** #1, #777, #5000, #12345: numbers people chase. */
export function luckyKind(number: number | null | undefined): LuckyKind | null {
  if (typeof number !== 'number' || !Number.isInteger(number) || number < 1) return null
  if (number === 1) return 'one'
  const d = String(number)
  if (d.length < 3) return null
  if (/^(\d)\1+$/.test(d)) return 'repdigit'
  if (/^[1-9]0+$/.test(d)) return 'round'
  if ('123456789'.startsWith(d)) return 'straight'
  return null
}

export interface ZoneMilestones {
  /** Number of the zone's first frame; null while it has none. */
  first: number | null
  /** Number of the frame that sold the zone out; null until it is sold out. */
  last: number | null
}

export interface Milestones {
  /**
   * Number of the frame that opened wave 2 (the one that sold wave 1 half
   * out). Every frame up to it is from the first wave; null while wave 2 is
   * still closed, so every frame so far is.
   */
  firstWaveLast: number | null
  zones: Record<ZoneId, ZoneMilestones>
}

export const NO_MILESTONES: Milestones = {
  firstWaveLast: null,
  zones: { 1: { first: null, last: null }, 2: { first: null, last: null }, 3: { first: null, last: null }, 4: { first: null, last: null } },
}

/**
 * Milestones from the frames on the wall (active and hidden: hidden frames
 * keep their cells). The API works out the same with SQL; the demo wall and
 * the tests use this.
 */
export function milestonesOf(frames: readonly { number: number | null; x: number; y: number; size: number }[]): Milestones {
  const sold = frames
    .filter((f) => f.size === 1 && typeof f.number === 'number')
    .sort((a, b) => a.number! - b.number!)
  const zones = structuredClone(NO_MILESTONES.zones)
  const count: Record<ZoneId, number> = { ...NOTHING_SOLD }
  const wave1 = ZONES.filter((z) => z.wave === 1)
  const unlockAt = Math.ceil(wave1.reduce((s, z) => s + z.capacity, 0) * WAVE_UNLOCK_SHARE)
  let inWave1 = 0
  let firstWaveLast: number | null = null
  for (const f of sold) {
    const z = zoneOfCell(f.x, f.y)
    count[z.id]++
    if (zones[z.id].first === null) zones[z.id].first = f.number
    if (count[z.id] === z.capacity) zones[z.id].last = f.number
    if (z.wave === 1 && ++inWave1 === unlockAt) firstWaveLast = f.number
  }
  return { firstWaveLast, zones }
}

export type TagId = 'founder' | 'first-wave' | 'first-in-zone' | 'last-spot' | 'lucky' | 'heart-neighbour'

export interface Tag {
  id: TagId
  label: string
  /** One line on what the tag means. */
  title: string
}

const LUCKY: Record<LuckyKind, Tag> = {
  one: { id: 'lucky', label: 'Number one', title: 'The very first frame on the wall' },
  repdigit: { id: 'lucky', label: 'Lucky number', title: 'A number of one repeated digit' },
  round: { id: 'lucky', label: 'Round number', title: 'A round number' },
  straight: { id: 'lucky', label: 'Straight', title: 'A straight run of digits: 123…' },
}

/**
 * Tags of a frame, most special first. Without milestones (prices not loaded
 * yet) only the tags that follow from the frame alone are given.
 */
export function tagsOf(f: { number: number | null; x: number; y: number; size: number }, m: Milestones | null): Tag[] {
  const tags: Tag[] = []
  const heart = isHeart(f.x, f.y, f.size)
  if (isFounder(f.number)) tags.push({ id: 'founder', label: 'Founder', title: `One of the first ${FOUNDERS.toLocaleString('en-US')} frames on the wall` })
  if (m && !heart && f.number !== null) {
    const z = m.zones[zoneOfFrame(f.x, f.y, f.size).id]
    if (z.first === f.number) tags.push({ id: 'first-in-zone', label: 'First in zone', title: 'The first frame in its zone' })
    if (z.last === f.number) tags.push({ id: 'last-spot', label: 'Last spot', title: 'Took the last free spot in its zone' })
    if (m.firstWaveLast === null || f.number <= m.firstWaveLast) {
      tags.push({ id: 'first-wave', label: 'First wave', title: 'Bought before the second wave opened' })
    }
  }
  const lucky = luckyKind(f.number)
  if (lucky) tags.push(LUCKY[lucky])
  if (isHeartNeighbour(f.x, f.y, f.size)) {
    tags.push({ id: 'heart-neighbour', label: 'Heart neighbour', title: `Right next to the heart · one of ${HEART_NEIGHBOURS} spots` })
  }
  return tags
}

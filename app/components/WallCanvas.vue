<script setup lang="ts">
import { CELL_PX, HEART, HEART_PRICE_FROM, isHeartCell, WALL_SIZE, ZONES, zoneOfCell } from '~/shared/wall'
import { tierOf } from '~/shared/tiers'
import { makeVessels } from '~/shared/vessels'
import { beatStep, heartbeatLabel, purchasesLastHour } from '~/shared/heartbeat'
import { readMine } from '~/shared/mine'
import type { WallFrame } from '~/composables/useWall'

export interface Ghost { x: number; y: number; size: number; valid: boolean }
export interface WallView { cx: number; cy: number; w: number; h: number }
/** A zone that is not on sale yet, with the line that says when it opens. */
export interface ClosedZone { id: number; title: string; detail: string }

const props = withDefaults(defineProps<{
  frames: WallFrame[]
  frameAt: (x: number, y: number) => WallFrame | null
  selectedId?: number | null
  /** Placement mode: taps pick a spot instead of opening frames. */
  placing?: boolean
  ghost?: Ghost | null
  ghostSize?: number
  initialCellPx?: number
  /** Tint the prestige zones and outline their borders. Off: one plain wall. */
  showZones?: boolean
  /** Rings not on sale yet: hatched, fenced off and labelled. */
  closed?: ClosedZone[]
  /** Frames this visitor bought (remembered in the browser): marked "You". */
  mine?: number[]
  /** A frame just bought by this visitor: it gets its own gold heartbeat. */
  celebrate?: number | null
  /** Show the heart's labels (its card is open, or its owner's frame is selected). */
  heartActive?: boolean
  /** A zone to light up on the wall (hovered in the stats panel). */
  highlightZone?: number | null
}>(), { heartActive: false, highlightZone: null, mine: () => [], celebrate: null, selectedId: null, placing: false, ghost: null, ghostSize: 1, initialCellPx: 32, showZones: false, closed: () => [] })

const emit = defineEmits<{
  select: [frame: WallFrame | null]
  /** A tap on the heart while nobody owns it. */
  heart: []
  pick: [cell: { x: number; y: number }]
  hover: [cell: { x: number; y: number } | null]
  nudge: [delta: { dx: number; dy: number }]
  view: [view: WallView]
}>()

const MIN_CELL_PX = 0.6
// Zoomed all the way in, a cell is three times its 100% size.
const MAX_CELL_PX = CELL_PX * 3

const wrap = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

// View state: the cell at the center of the screen and the size of a cell in CSS px.
let cx = HEART.x + HEART.size / 2
let cy = HEART.y + HEART.size / 2
let s = props.initialCellPx
let width = 0
let height = 0
let dpr = 1
let frameRequested = false

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

// Photos load lazily, only for frames big enough on screen to show them.
const images = new Map<string, HTMLImageElement | 'error'>()
function photo(url: string): HTMLImageElement | null {
  const got = images.get(url)
  if (got === 'error') return null
  if (got) return got.complete && got.naturalWidth ? got : null
  const img = new Image()
  img.decoding = 'async'
  img.onload = () => requestDraw()
  img.onerror = () => images.set(url, 'error')
  img.src = url
  images.set(url, img)
  return null
}

function toCell(px: number, py: number) {
  return { fx: cx + (px - width / 2) / s, fy: cy + (py - height / 2) / s }
}

function topLeftFor(fx: number, fy: number) {
  const n = props.ghostSize
  return { x: Math.floor(fx - n / 2 + 0.5), y: Math.floor(fy - n / 2 + 0.5) }
}

function requestDraw() {
  if (frameRequested) return
  frameRequested = true
  requestAnimationFrame(() => {
    frameRequested = false
    draw()
  })
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

// Users who ask for less motion get a still heart and no pulses.
const reducedMotion = import.meta.client && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// The living wall: a dark body, blood in the seams between the photos, vessels
// running out from the heart and a pulse on every new frame.
const COLORS = {
  outside: '#07050A',
  wall: '#140B0F',
  heart: '#E0344B',
  fresh: '#FFE2DC',
}

/**
 * The heart beats at a pace set by purchases in the last hour (see
 * shared/heartbeat.ts): once every 10 s at rest, faster as frames go live.
 * Every new frame also makes it beat at once.
 */
let beatEvery = 10
let lastBeat = -Infinity
let perHour = 0
/** Strength of the beat (0..~1.1) `dt` seconds after it started: "lub", then a softer "dub". */
function beatShape(dt: number) {
  const g = (c: number, w: number) => Math.exp(-(((dt - c) / w) ** 2))
  return g(0.07, 0.06) + 0.55 * g(0.33, 0.07)
}
/** How long one beat shows (shape and the ring it sends out), in seconds. */
const BEAT_SHOW = 1.4
function countPurchases() {
  perHour = purchasesLastHour(props.frames, Date.now())
  beatEvery = beatStep(perHour).every
}
let sleepTimer: ReturnType<typeof setTimeout> | null = null

/** The gold heartbeat of a frame this visitor just bought. */
const MINE_COLOR = '#FFD27A'
let ceremony: { id: number; at: number } | null = null
const CEREMONY_MS = 12000

/**
 * One pulse per new frame bought by someone else: a ring that leaves the
 * frame itself (x, y in cells), so you see where on the wall it happened.
 * Several frames in one update go one after another, PULSE_GAP_MS apart,
 * and the heart answers each with a beat.
 */
const PULSE_MS = 1800
const PULSE_SPEED = 320 // screen px per second
const PULSE_GAP_MS = 900
const pulses: { x: number; y: number; at: number }[] = []
const beatQueue: number[] = []
/** How long a new frame stays lit, in ms. */
const FRESH_MS = 9000
const fresh = new Map<number, number>()

const VESSELS = makeVessels().map((v) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let i = 0; i < v.points.length; i += 2) {
    x0 = Math.min(x0, v.points[i]!); x1 = Math.max(x1, v.points[i]!)
    y0 = Math.min(y0, v.points[i + 1]!); y1 = Math.max(y1, v.points[i + 1]!)
  }
  return { ...v, box: { x0, y0, x1, y1 } }
})

function heartPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number) {
  const h = w * 0.9
  const top = cy - h * 0.35
  ctx.beginPath()
  ctx.moveTo(cx, cy + h * 0.5)
  ctx.bezierCurveTo(cx - w * 0.6, cy + h * 0.05, cx - w * 0.5, top - h * 0.3, cx, top + h * 0.05)
  ctx.bezierCurveTo(cx + w * 0.5, top - h * 0.3, cx + w * 0.6, cy + h * 0.05, cx, cy + h * 0.5)
  ctx.closePath()
}

/**
 * The heart of the wall. It beats (lub-dub) with a red glow. Once someone owns
 * it, their photo shows through and the beat stays on the border.
 */
function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, taken: boolean, b: number) {
  const r = Math.min(size * 0.08, 8)

  // Glow, stronger on each beat.
  ctx.save()
  ctx.shadowColor = `rgba(255, 50, 80, ${0.4 + 0.45 * b})`
  ctx.shadowBlur = clamp(size * (0.3 + 0.25 * b), 10, 90)
  roundRectPath(ctx, x, y, size, size, r)
  if (taken) {
    ctx.strokeStyle = COLORS.heart
    ctx.lineWidth = 2
    ctx.stroke()
  } else {
    ctx.fillStyle = '#3A0A14'
    ctx.fill()
  }
  ctx.restore()

  if (!taken) {
    const core = ctx.createRadialGradient(x + size / 2, y + size / 2, 0, x + size / 2, y + size / 2, size * 0.75)
    core.addColorStop(0, `rgba(255, 70, 95, ${0.35 + 0.35 * b})`)
    core.addColorStop(1, 'rgba(255, 70, 95, 0)')
    ctx.fillStyle = core
    roundRectPath(ctx, x, y, size, size, r)
    ctx.fill()
    if (size >= 28) {
      const w = size * (0.5 + 0.07 * b)
      heartPath(ctx, x + size / 2, y + size / 2 + size * 0.03, w)
      ctx.fillStyle = '#FF3B52'
      ctx.fill()
    }
  }

  ctx.save()
  ctx.strokeStyle = `rgba(255, ${74 + Math.round(60 * b)}, ${94 + Math.round(40 * b)}, 1)`
  ctx.lineWidth = Math.max(2, size * (taken ? 0.05 : 0.035))
  roundRectPath(ctx, x, y, size, size, r)
  ctx.stroke()
  ctx.restore()

  // Zoomed out, the block is too small for its icon: a heart marker of a
  // fixed size stays on top, so the heart can be found at any zoom.
  if (size < 28) {
    const w = (20 + 3 * b)
    ctx.save()
    ctx.shadowColor = `rgba(255, 50, 80, ${0.6 + 0.3 * b})`
    ctx.shadowBlur = 14
    heartPath(ctx, x + size / 2, y + size / 2 + 1, w)
    ctx.fillStyle = '#FF3B52'
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(255, 220, 226, 0.9)'
    ctx.stroke()
    ctx.restore()
  }
}

/** How far past the barrier a wave keeps breaking, in screen px. */
const SPLASH_PX = 140

/**
 * Waves break on the edge of what is open now (the fence of the closed
 * rings, or the wall's edge once all is open): where a ring meets the edge,
 * the edge flares and spray flies back, sliding along it as the ring grows.
 */
function drawSplashes(ctx: CanvasRenderingContext2D, rings: { x: number; y: number; r: number; a: number }[],
  ox: number, oy: number, ow: number) {
  if (!rings.length) return
  const x0 = ox, y0 = oy, x1 = ox + ow, y1 = oy + ow
  ctx.save()
  ctx.lineCap = 'round'
  for (const ring of rings) {
    // Each side: where it is, which way is inside, and along which axis it runs.
    const sides = [
      { d: ring.x - x0, vertical: true, at: x0, nx: 1, ny: 0 },
      { d: x1 - ring.x, vertical: true, at: x1, nx: -1, ny: 0 },
      { d: ring.y - y0, vertical: false, at: y0, nx: 0, ny: 1 },
      { d: y1 - ring.y, vertical: false, at: y1, nx: 0, ny: -1 },
    ]
    for (const side of sides) {
      if (side.d < 0 || ring.r <= side.d) continue
      const p = ring.r - side.d // how far the wave has pushed into the barrier
      const strength = Math.min(1, ring.a * 1.8) * Math.max(0, 1 - p / SPLASH_PX)
      if (strength < 0.03) continue
      const h = Math.sqrt(ring.r * ring.r - side.d * side.d)
      for (const sign of [-1, 1]) {
        const along = (side.vertical ? ring.y : ring.x) + sign * h
        if (along < (side.vertical ? y0 : x0) || along > (side.vertical ? y1 : x1)) continue
        const hx = side.vertical ? side.at : along
        const hy = side.vertical ? along : side.at
        const tx = side.vertical ? 0 : 1, ty = side.vertical ? 1 : 0
        // The barrier flares where the wave hits it.
        const half = 10 + p * 0.45
        ctx.shadowColor = 'rgba(255, 80, 105, 0.9)'
        ctx.shadowBlur = 12
        ctx.strokeStyle = `rgba(255, 150, 165, ${strength})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(hx - tx * half, hy - ty * half)
        ctx.lineTo(hx + tx * half, hy + ty * half)
        ctx.stroke()
        // Spray thrown back into the open part.
        ctx.shadowBlur = 0
        ctx.fillStyle = `rgba(255, 196, 206, ${strength})`
        for (let k = 0; k < 4; k++) {
          const back = p * (0.22 + 0.12 * (k % 2))
          const spread = (k - 1.5) * p * 0.16
          ctx.beginPath()
          ctx.arc(hx + side.nx * back + tx * spread, hy + side.ny * back + ty * spread, 1.8, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }
  ctx.restore()
}

let hatch: CanvasPattern | null = null
function hatchPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (hatch) return hatch
  const tile = document.createElement('canvas')
  tile.width = 10
  tile.height = 10
  const t = tile.getContext('2d')
  if (!t) return null
  t.strokeStyle = 'rgba(255, 255, 255, 0.035)'
  t.lineWidth = 1.5
  t.beginPath()
  t.moveTo(-2, 12); t.lineTo(12, -2)
  t.moveTo(-2, 2); t.lineTo(2, -2)
  t.moveTo(8, 12); t.lineTo(12, 8)
  t.stroke()
  hatch = ctx.createPattern(tile, 'repeat')
  return hatch
}

/** The part of the wall on sale now: the largest zone whose rings are all open. */
function openArea() {
  const closedIds = new Set(props.closed.map((c) => c.id))
  let open = { min: 0, max: WALL_SIZE - 1 }
  for (const z of ZONES) {
    if (closedIds.has(z.id)) break
    open = { min: z.min, max: z.max }
  }
  return open
}

/**
 * A label on a ring that is not on sale yet, saying when it opens. Shown only
 * on demand: under the pointer, after a tap, or for the zone lit from the
 * stats panel.
 */
function drawZoneLabel(ctx: CanvasRenderingContext2D, info: ClosedZone, X: number, Y: number) {
  const big = 14
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `600 ${big}px 'Space Grotesk', Inter, sans-serif`
  const titleW = ctx.measureText(info.title).width
  ctx.font = `400 ${big - 2}px Inter, sans-serif`
  const w = Math.min(Math.max(titleW, ctx.measureText(info.detail).width) + 32, width - 16)
  const h = info.detail ? big * 2 + 26 : big + 22
  X = clamp(X, w / 2 + 8, width - w / 2 - 8)
  Y = clamp(Y, h / 2 + 8, height - h / 2 - 8)
  ctx.fillStyle = 'rgba(22, 14, 18, 0.94)'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)'
  ctx.lineWidth = 1
  roundRectPath(ctx, X - w / 2, Y - h / 2, w, h, 10)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#F3E6E8'
  ctx.font = `600 ${big}px 'Space Grotesk', Inter, sans-serif`
  ctx.fillText(info.title, X, info.detail ? Y - big / 2 - 2 : Y)
  if (info.detail) {
    ctx.fillStyle = '#A89AA0'
    ctx.font = `400 ${big - 2}px Inter, sans-serif`
    ctx.fillText(info.detail, X, Y + big / 2 + 3)
  }
  ctx.restore()
}

/** The point of a ring nearest the middle of the screen, in cells. */
function ringPointNearView(i: number) {
  const z = ZONES[i]!, inner = ZONES[i - 1]!
  const band = inner.min - z.min
  const lo = z.min, hi = z.max + 1, ilo = inner.min, ihi = inner.max + 1
  let px = clamp(cx, lo + band / 2, hi - band / 2)
  let py = clamp(cy, lo + band / 2, hi - band / 2)
  if (px > ilo && px < ihi && py > ilo && py < ihi) {
    const d = [px - ilo, ihi - px, py - ilo, ihi - py]
    const k = d.indexOf(Math.min(...d))
    if (k === 0) px = ilo - band / 2
    else if (k === 1) px = ihi + band / 2
    else if (k === 2) py = ilo - band / 2
    else py = ihi + band / 2
  }
  return { px, py }
}

// What the pointer is over, for labels shown on hover (desktop) or tap (phones).
let pointerAt: { x: number; y: number } | null = null
let heartHover = false
let zoneTip: { id: number; x: number; y: number; until: number } | null = null

function gridPath(ctx: CanvasRenderingContext2D, sx: (x: number) => number, sy: (y: number) => number,
  x0: number, x1: number, y0: number, y1: number) {
  ctx.beginPath()
  for (let x = x0; x <= x1; x++) {
    const px = sx(x)
    ctx.moveTo(px, sy(y0)); ctx.lineTo(px, sy(y1))
  }
  for (let y = y0; y <= y1; y++) {
    const py = sy(y)
    ctx.moveTo(sx(x0), py); ctx.lineTo(sx(x1), py)
  }
}

function vesselsPath(ctx: CanvasRenderingContext2D, sx: (x: number) => number, sy: (y: number) => number,
  width: number, view: { x0: number; x1: number; y0: number; y1: number }) {
  ctx.beginPath()
  for (const v of VESSELS) {
    if (Math.abs(v.width - width) > 1e-9) continue
    const b = v.box
    if (b.x1 < view.x0 || b.x0 > view.x1 || b.y1 < view.y0 || b.y0 > view.y1) continue
    ctx.moveTo(sx(v.points[0]!), sy(v.points[1]!))
    for (let i = 2; i < v.points.length; i += 2) ctx.lineTo(sx(v.points[i]!), sy(v.points[i + 1]!))
  }
}
const VESSEL_WIDTHS = [...new Set(VESSELS.map((v) => v.width))]

function draw() {
  const c = canvas.value
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const now = performance.now()
  while (beatQueue.length && beatQueue[0]! <= now) lastBeat = beatQueue.shift()!
  if (!reducedMotion && now - lastBeat >= beatEvery * 1000) lastBeat = now
  const dt = (now - lastBeat) / 1000
  const b = reducedMotion ? 0 : beatShape(dt)
  const sx = (x: number) => (x - cx) * s + width / 2
  const sy = (y: number) => (y - cy) * s + height / 2
  const W = WALL_SIZE * s

  ctx.fillStyle = COLORS.outside
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = COLORS.wall
  ctx.fillRect(sx(0), sy(0), W, W)

  const x0 = Math.max(0, Math.floor(cx - width / 2 / s))
  const x1 = Math.min(WALL_SIZE, Math.ceil(cx + width / 2 / s))
  const y0 = Math.max(0, Math.floor(cy - height / 2 / s))
  const y1 = Math.min(WALL_SIZE, Math.ceil(cy + height / 2 / s))

  const open = openArea()
  const ox = sx(open.min), oy = sy(open.min), ow = (open.max - open.min + 1) * s
  const hcx = sx(HEART.x + HEART.size / 2), hcy = sy(HEART.y + HEART.size / 2)
  // How far the warmth of the heart reaches, in screen px.
  const reach = Math.max(ow * 0.75, 220)
  const clipOpen = () => { ctx.beginPath(); ctx.rect(ox, oy, ow, ow); ctx.clip() }
  const clipClosed = () => {
    ctx.beginPath(); ctx.rect(sx(0), sy(0), W, W); ctx.rect(ox, oy, ow, ow); ctx.clip('evenodd')
  }
  const hasClosed = props.closed.length > 0

  // Warmth around the heart, over the part of the wall that is open.
  ctx.save()
  clipOpen()
  const warm = ctx.createRadialGradient(hcx, hcy, 0, hcx, hcy, reach)
  warm.addColorStop(0, `rgba(200, 30, 60, ${0.32 + 0.1 * b})`)
  warm.addColorStop(0.45, 'rgba(150, 24, 48, 0.13)')
  warm.addColorStop(1, 'rgba(120, 20, 40, 0.04)')
  ctx.fillStyle = warm
  ctx.fillRect(ox, oy, ow, ow)
  ctx.restore()

  // Zones, when asked for: a light tint and a dashed border in the tier colour.
  if (props.showZones) {
    ctx.save()
    for (const z of [...ZONES].reverse()) {
      if (z.id === 4) continue
      const zx = sx(z.min), zy = sy(z.min), zw = (z.max - z.min + 1) * s
      ctx.globalAlpha = 0.07
      ctx.fillStyle = tierOf(z.id).accent
      ctx.fillRect(zx, zy, zw, zw)
      ctx.globalAlpha = 0.7
      ctx.setLineDash([6, 6])
      ctx.lineWidth = 1.5
      ctx.strokeStyle = tierOf(z.id).accent
      ctx.strokeRect(zx, zy, zw, zw)
    }
    ctx.restore()
  }

  // Seams between the cells: faint everywhere, carrying blood where the wall is open.
  const seam = s >= 6 ? clamp(s * 0.04, 1, 3) : 0
  if (seam) {
    ctx.save()
    ctx.lineWidth = seam
    gridPath(ctx, sx, sy, x0, x1, y0, y1)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)'
    ctx.stroke()
    clipOpen()
    const blood = ctx.createRadialGradient(hcx, hcy, 0, hcx, hcy, reach * 1.1)
    blood.addColorStop(0, `rgba(255, 70, 95, ${0.45 + 0.2 * b})`)
    blood.addColorStop(0.5, 'rgba(220, 50, 75, 0.24)')
    blood.addColorStop(1, 'rgba(170, 35, 60, 0.1)')
    ctx.strokeStyle = blood
    gridPath(ctx, sx, sy, x0, x1, y0, y1)
    ctx.stroke()
    ctx.restore()
  }

  // Rings: red from the heart on every beat; light pink from every new frame
  // bought by someone else.
  const rings: { x: number; y: number; r: number; a: number; rgb: string; w: number }[] = []
  if (!reducedMotion) {
    const near = hcx > -500 && hcy > -500 && hcx < width + 500 && hcy < height + 500
    if (near && dt >= 0 && dt < BEAT_SHOW) {
      const ph = dt / BEAT_SHOW
      rings.push({ x: hcx, y: hcy, r: ph * 420, a: 0.16 * (1 - ph), rgb: '255, 80, 105', w: 26 })
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i]!
      const age = now - p.at
      if (age < 0) continue
      // A pulse that has a barrier in reach runs on until it breaks on it.
      const px = sx(p.x), py = sy(p.y)
      const toEdge = Math.min(px - ox, ox + ow - px, py - oy, oy + ow - py)
      const reach = toEdge > 0 && toEdge < 1400 ? toEdge + SPLASH_PX : (PULSE_MS / 1000) * PULSE_SPEED
      const r = Math.max(s / 2, 4) + (age / 1000) * PULSE_SPEED
      if (r > Math.max(reach, (PULSE_MS / 1000) * PULSE_SPEED)) {
        pulses.splice(i, 1)
        continue
      }
      const k = Math.min(1, r / Math.max(reach, 1))
      rings.push({ x: px, y: py, r, a: 0.75 * Math.sqrt(1 - k), rgb: '255, 196, 206', w: 4 })
    }
    if (rings.length) {
      // Waves stay inside the open part of the wall: the closed rings stop them.
      ctx.save()
      clipOpen()
      for (const ring of rings) {
        ctx.beginPath()
        ctx.arc(ring.x, ring.y, Math.max(0, ring.r), 0, Math.PI * 2)
        ctx.lineWidth = ring.w
        ctx.strokeStyle = `rgba(${ring.rgb}, ${ring.a})`
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  // Rings not on sale yet: cold and dim, behind a fence.
  if (hasClosed) {
    ctx.save()
    clipClosed()
    ctx.fillStyle = 'rgba(8, 9, 14, 0.6)'
    ctx.fillRect(sx(0), sy(0), W, W)
    const pattern = hatchPattern(ctx)
    if (pattern) {
      ctx.fillStyle = pattern
      ctx.fillRect(sx(0), sy(0), W, W)
    }
    ctx.restore()
  }

  // Vessels: red and alive in the open part, grey and dashed where the blood
  // has not reached yet.
  const vw = clamp(s * 0.07, 1.2, 4)
  const viewCells = { x0, x1, y0, y1 }
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (hasClosed) {
    ctx.save()
    clipClosed()
    ctx.strokeStyle = 'rgba(150, 140, 160, 0.28)'
    for (const w of VESSEL_WIDTHS) {
      ctx.lineWidth = vw * w
      ctx.setLineDash([vw * 2, vw * 3])
      vesselsPath(ctx, sx, sy, w, viewCells)
      ctx.stroke()
    }
    ctx.restore()
  }
  clipOpen()
  const vessel = ctx.createRadialGradient(hcx, hcy, 0, hcx, hcy, reach * 1.2)
  vessel.addColorStop(0, `rgba(255, ${60 + Math.round(50 * b)}, 88, 0.95)`)
  vessel.addColorStop(0.6, 'rgba(230, 50, 75, 0.6)')
  vessel.addColorStop(1, 'rgba(190, 40, 65, 0.35)')
  ctx.strokeStyle = vessel
  for (const w of VESSEL_WIDTHS) {
    ctx.lineWidth = vw * w
    vesselsPath(ctx, sx, sy, w, viewCells)
    ctx.stroke()
  }
  ctx.restore()

  if (hasClosed) {
    ctx.save()
    ctx.setLineDash([8, 6])
    ctx.strokeStyle = 'rgba(255, 90, 110, 0.55)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(ox, oy, ow, ow)
    ctx.restore()
  }
  drawSplashes(ctx, rings, ox, oy, ow)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 1
  ctx.strokeRect(sx(0), sy(0), W, W)

  // The zone lit from the stats panel: its ring glows in its colour.
  if (props.highlightZone) {
    const i = ZONES.findIndex((z) => z.id === props.highlightZone)
    if (i >= 0) {
      const z = ZONES[i]!, inner = ZONES[i - 1]
      ctx.save()
      ctx.beginPath()
      ctx.rect(sx(z.min), sy(z.min), (z.max - z.min + 1) * s, (z.max - z.min + 1) * s)
      if (inner) ctx.rect(sx(inner.min), sy(inner.min), (inner.max - inner.min + 1) * s, (inner.max - inner.min + 1) * s)
      ctx.globalAlpha = 0.2
      ctx.fillStyle = tierOf(z.id).accent
      ctx.fill('evenodd')
      ctx.restore()
    }
  }

  // Frames, inset so the seams show around every photo. The pulse lights
  // their rims as it passes; the photos themselves are never tinted.
  const inset = seam / 2
  const ownIds = props.mine.length ? new Set(props.mine) : null
  const lit: { f: WallFrame; k: number }[] = []
  for (const f of props.frames) {
    if (f.x + f.size < x0 || f.x > x1 || f.y + f.size < y0 || f.y > y1) continue
    const px = sx(f.x), py = sy(f.y), size = f.size * s
    const fx = px + inset, fy = py + inset, fs = size - inset * 2
    const rr = Math.min(3, size / 8)
    ctx.fillStyle = f.color
    if (size >= 6) {
      roundRectPath(ctx, fx, fy, fs, fs, rr)
      ctx.fill()
    } else {
      ctx.fillRect(px, py, Math.max(size, 0.8), Math.max(size, 0.8))
    }
    const img = f.photoUrl && size >= 8 ? photo(f.photoUrl) : null
    if (img) {
      ctx.save()
      roundRectPath(ctx, fx, fy, fs, fs, rr)
      ctx.clip()
      ctx.drawImage(img, fx, fy, fs, fs)
      ctx.restore()
    } else if (size >= 28) {
      ctx.fillStyle = f.ink
      ctx.font = `600 ${Math.round(Math.min(size * 0.36, 30))}px 'Space Grotesk', Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(f.initials, px + size / 2, py + size / 2 + 1)
    }
    // Your frames keep their gold rim and do not react to other people's pulses.
    if (rings.length && size >= 6 && !ownIds?.has(f.id)) {
      let a = 0
      for (const ring of rings) {
        const d = Math.hypot(px + size / 2 - ring.x, py + size / 2 - ring.y)
        a = Math.max(a, Math.min(ring.a * 2.2, 0.9) * Math.max(0, 1 - Math.abs(d - ring.r) / 22))
      }
      if (a > 0.03) {
        ctx.strokeStyle = `rgba(255, 150, 160, ${Math.min(1, a)})`
        ctx.lineWidth = 2
        roundRectPath(ctx, fx, fy, fs, fs, rr)
        ctx.stroke()
      }
    }
    if (f.id === props.selectedId) {
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.strokeRect(px - 2, py - 2, size + 4, size + 4)
    }
    const at = fresh.get(f.id)
    if (at !== undefined && now >= at) lit.push({ f, k: 1 - (now - at) / FRESH_MS })
  }
  for (const [id, at] of fresh) if (now - at > FRESH_MS) fresh.delete(id)

  // New frames: a bright rim for a few seconds and, close enough, their heartbeat number.
  for (const { f, k } of lit) {
    if (k <= 0) continue
    const px = sx(f.x), py = sy(f.y), size = Math.max(f.size * s, 4)
    ctx.save()
    ctx.globalAlpha = Math.min(1, k * 1.5)
    ctx.shadowColor = 'rgba(255, 80, 105, 0.9)'
    ctx.shadowBlur = 14
    ctx.strokeStyle = COLORS.fresh
    ctx.lineWidth = 2.5
    roundRectPath(ctx, px - 2, py - 2, size + 4, size + 4, 4)
    ctx.stroke()
    ctx.restore()
    if (f.number !== null && s >= 10) {
      const label = `Heartbeat #${f.number.toLocaleString('en-US')}`
      ctx.save()
      ctx.globalAlpha = Math.min(1, k * 1.5)
      ctx.font = '500 12px Inter, system-ui, sans-serif'
      const tw = ctx.measureText(label).width + 20
      const lx = px + size / 2 - tw / 2, ly = py - 32
      ctx.fillStyle = 'rgba(42, 10, 16, 0.95)'
      roundRectPath(ctx, lx, ly, tw, 24, 12)
      ctx.fill()
      ctx.strokeStyle = COLORS.fresh
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillStyle = COLORS.fresh
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, lx + tw / 2, ly + 12.5)
      ctx.restore()
    }
  }

  // The heart: always beating.
  const hx = sx(HEART.x), hy = sy(HEART.y), hs = Math.max(HEART.size * s, 6)
  const heartTaken = !!props.frameAt(HEART.x, HEART.y)
  const heartVisible = hx + hs > -100 && hy + hs > -100 && hx < width + 100 && hy < height + 100
  if (heartVisible) drawHeart(ctx, hx, hy, hs, heartTaken, b)
  const heartLabels = heartHover || props.heartActive
  if (s >= 3 && heartLabels) {
    const label = heartTaken ? 'The heart' : `The heart · from $${HEART_PRICE_FROM.toLocaleString('en-US')}`
    ctx.font = "500 12px Inter, system-ui, sans-serif"
    const tw = ctx.measureText(label).width + 24
    const lx = hx + hs / 2 - tw / 2, ly = hy - 40
    ctx.fillStyle = COLORS.heart
    roundRectPath(ctx, lx, ly, tw, 26, 13)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, lx + tw / 2, ly + 13.5)
  }

  // Frames this visitor owns: a thin gold rim and, close enough, "You".
  const mineSet = props.mine.length ? new Set(props.mine) : null
  if (ceremony && now - ceremony.at > CEREMONY_MS) ceremony = null
  for (const f of props.frames) {
    const isMine = mineSet?.has(f.id) || ceremony?.id === f.id
    if (!isMine) continue
    if (f.x + f.size < x0 || f.x > x1 || f.y + f.size < y0 || f.y > y1) continue
    const px = sx(f.x), py = sy(f.y), size = Math.max(f.size * s, 3)
    const fcx = px + size / 2, fcy = py + size / 2
    // The ceremony: three gold rings leave the frame itself, clearly not from the heart.
    if (ceremony?.id === f.id && !reducedMotion) {
      ctx.save()
      for (let k = 0; k < 3; k++) {
        const age = (now - ceremony.at - 400 - k * 1100) / 1000
        if (age < 0 || age > 1.6) continue
        const r = Math.max(size / 2, 4) + age * 170
        ctx.beginPath()
        ctx.arc(fcx, fcy, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 210, 122, ${0.85 * (1 - age / 1.6)})`
        ctx.lineWidth = 3
        ctx.stroke()
      }
      ctx.restore()
    }
    ctx.save()
    ctx.shadowColor = 'rgba(255, 200, 100, 0.8)'
    ctx.shadowBlur = ceremony?.id === f.id ? 16 : 6
    ctx.strokeStyle = MINE_COLOR
    ctx.lineWidth = ceremony?.id === f.id ? 3 : 2
    roundRectPath(ctx, px - 2, py - 2, size + 4, size + 4, 4)
    ctx.stroke()
    ctx.restore()
    if (s >= 10) {
      const label = ceremony?.id === f.id && f.number !== null
        ? `You · Heartbeat #${f.number.toLocaleString('en-US')}`
        : 'You'
      ctx.save()
      ctx.font = '600 12px Inter, system-ui, sans-serif'
      const tw = ctx.measureText(label).width + 20
      const lx = fcx - tw / 2, ly = py - 32
      ctx.fillStyle = MINE_COLOR
      roundRectPath(ctx, lx, ly, tw, 24, 12)
      ctx.fill()
      ctx.fillStyle = '#3A2606'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, fcx, ly + 12.5)
      ctx.restore()
    }
  }

  // The heart's pace, under it: how alive the wall is right now.
  if (s >= 3 && heartVisible && heartLabels) {
    const label = heartbeatLabel(perHour)
    ctx.save()
    ctx.font = '500 12px Inter, system-ui, sans-serif'
    const tw = ctx.measureText(label).width + 30
    const lx = hx + hs / 2 - tw / 2, ly = hy + hs + 14
    ctx.fillStyle = 'rgba(42, 10, 16, 0.9)'
    roundRectPath(ctx, lx, ly, tw, 24, 12)
    ctx.fill()
    ctx.strokeStyle = `rgba(255, 90, 110, ${0.35 + 0.5 * Math.min(1, b)})`
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#FF5A6E'
    heartPath(ctx, lx + 14, ly + 12, 9 + 2 * Math.min(1, b))
    ctx.fill()
    ctx.fillStyle = '#F3E6E8'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, lx + 22, ly + 12.5)
    ctx.restore()
  }

  // The zone lit from the stats panel: a bright outline over the photos.
  const hz = props.highlightZone ? ZONES.findIndex((z) => z.id === props.highlightZone) : -1
  if (hz >= 0) {
    const z = ZONES[hz]!, inner = ZONES[hz - 1]
    const accent = tierOf(z.id).accent
    ctx.save()
    ctx.shadowColor = accent
    ctx.shadowBlur = 12
    ctx.strokeStyle = accent
    ctx.lineWidth = 2.5
    const zw = (z.max - z.min + 1) * s
    ctx.strokeRect(sx(z.min), sy(z.min), zw, zw)
    if (inner) ctx.strokeRect(sx(inner.min), sy(inner.min), (inner.max - inner.min + 1) * s, (inner.max - inner.min + 1) * s)
    ctx.restore()
  }

  // Closed-ring labels, only on demand.
  if (zoneTip && now > zoneTip.until) zoneTip = null
  const tipId = zoneTip?.id ?? null
  for (const info of props.closed) {
    if (zoneTip && info.id === tipId) {
      drawZoneLabel(ctx, info, zoneTip.x, zoneTip.y - 56)
    } else if (info.id === props.highlightZone) {
      const i = ZONES.findIndex((z) => z.id === info.id)
      if (i > 0) {
        const { px, py } = ringPointNearView(i)
        drawZoneLabel(ctx, info, sx(px), sy(py))
      }
    }
  }

  // Ghost of the frame being placed.
  const g = props.ghost
  if (g) {
    const gx = sx(g.x), gy = sy(g.y), gs = Math.max(g.size * s, 4)
    ctx.fillStyle = g.valid ? 'rgba(250, 199, 117, 0.6)' : 'rgba(226, 75, 74, 0.25)'
    ctx.fillRect(gx, gy, gs, gs)
    ctx.save()
    ctx.setLineDash([4, 3])
    ctx.strokeStyle = g.valid ? '#FAC775' : '#E24B4A'
    ctx.lineWidth = 2
    ctx.strokeRect(gx, gy, gs, gs)
    ctx.restore()
    ctx.strokeStyle = g.valid ? 'rgba(250, 199, 117, 0.35)' : 'rgba(226, 75, 74, 0.35)'
    ctx.lineWidth = 4
    ctx.strokeRect(gx - 4, gy - 4, gs + 8, gs + 8)
  }

  // Keep it alive while something moves; between beats, sleep until the next one.
  if (sleepTimer) {
    clearTimeout(sleepTimer)
    sleepTimer = null
  }
  if (reducedMotion) {
    if (fresh.size || ceremony || zoneTip) sleepTimer = setTimeout(requestDraw, 1000)
  } else if (pulses.length || fresh.size || ceremony || zoneTip || (heartVisible && dt < BEAT_SHOW)) {
    requestDraw()
  } else {
    sleepTimer = setTimeout(requestDraw, Math.max(16, lastBeat + beatEvery * 1000 - now))
  }

  emit('view', { cx, cy, w: width / s, h: height / s })
}

function zoomAt(px: number, py: number, factor: number) {
  const before = toCell(px, py)
  s = clamp(s * factor, MIN_CELL_PX, MAX_CELL_PX)
  cx = before.fx - (px - width / 2) / s
  cy = before.fy - (py - height / 2) / s
  clampCenter()
  requestDraw()
}

function clampCenter() {
  cx = clamp(cx, -50, WALL_SIZE + 50)
  cy = clamp(cy, -50, WALL_SIZE + 50)
}

function zoomBy(factor: number) {
  zoomAt(width / 2, height / 2, factor)
}

function centerOn(x: number, y: number, cellPx?: number) {
  cx = x
  cy = y
  if (cellPx) s = clamp(cellPx, MIN_CELL_PX, MAX_CELL_PX)
  clampCenter()
  requestDraw()
}

/** Zoom out (or in) so a whole zone fits on screen, centered on the heart. */
function fitZone(id: number) {
  const z = ZONES.find((q) => q.id === id)
  if (!z) return
  const size = z.max - z.min + 1
  centerOn(HEART.x + HEART.size / 2, HEART.y + HEART.size / 2, (Math.min(width, height) * 0.9) / size)
}

defineExpose({ zoomBy, centerOn, fitZone })

// Pointer input: one pointer pans, two pinch-zoom, a short tap selects.
const pointers = new Map<number, { x: number; y: number }>()
let drag: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null
let pinch: { dist: number; s: number; fx: number; fy: number } | null = null

function localPos(e: PointerEvent | WheelEvent) {
  const r = canvas.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

function startPinch() {
  const [a, b] = [...pointers.values()]
  if (!a || !b) return
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const cell = toCell(mid.x, mid.y)
  pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, s, fx: cell.fx, fy: cell.fy }
}

function onPointerDown(e: PointerEvent) {
  try {
    canvas.value!.setPointerCapture(e.pointerId)
  } catch {
    // Not a live pointer (e.g. a synthetic event): carry on without capture.
  }
  const p = localPos(e)
  pointers.set(e.pointerId, p)
  if (pointers.size === 1) {
    drag = { x: p.x, y: p.y, cx, cy, moved: false }
  } else if (pointers.size === 2) {
    if (drag) drag.moved = true
    startPinch()
  }
}

function onPointerMove(e: PointerEvent) {
  const p = localPos(e)
  if (!pointers.has(e.pointerId)) {
    // Hover with no button pressed.
    const { fx, fy } = toCell(p.x, p.y)
    if (props.placing) {
      emit('hover', topLeftFor(fx, fy))
    } else if (canvas.value) {
      const x = Math.floor(fx), y = Math.floor(fy)
      canvas.value.style.cursor = props.frameAt(x, y) || isHeartCell(x, y) ? 'pointer' : 'grab'
      updateHover(p, x, y)
    }
    return
  }
  pointers.set(e.pointerId, p)
  if (pointers.size >= 2 && pinch) {
    const [a, b] = [...pointers.values()]
    const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1
    const mid = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 }
    s = clamp(pinch.s * (dist / pinch.dist), MIN_CELL_PX, MAX_CELL_PX)
    cx = pinch.fx - (mid.x - width / 2) / s
    cy = pinch.fy - (mid.y - height / 2) / s
    clampCenter()
    requestDraw()
    return
  }
  if (drag) {
    const dx = p.x - drag.x, dy = p.y - drag.y
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true
    if (drag.moved) {
      cx = drag.cx - dx / s
      cy = drag.cy - dy / s
      clampCenter()
      if (canvas.value) canvas.value.style.cursor = 'grabbing'
      requestDraw()
    }
  }
}

function onPointerUp(e: PointerEvent) {
  const p = localPos(e)
  const wasTap = pointers.size === 1 && drag && !drag.moved
  pointers.delete(e.pointerId)
  if (wasTap) {
    const { fx, fy } = toCell(p.x, p.y)
    if (props.placing) {
      emit('pick', topLeftFor(fx, fy))
    } else {
      const cell = { x: Math.floor(fx), y: Math.floor(fy) }
      const frame = props.frameAt(cell.x, cell.y)
      if (!frame && isHeartCell(cell.x, cell.y)) emit('heart')
      else emit('select', frame)
      if (!frame && e.pointerType !== 'mouse') {
        const z = zoneOfCell(cell.x, cell.y)
        const inWall = cell.x >= 0 && cell.y >= 0 && cell.x < WALL_SIZE && cell.y < WALL_SIZE
        zoneTip = inWall && !isHeartCell(cell.x, cell.y) && props.closed.some((c) => c.id === z.id)
          ? { id: z.id, x: p.x, y: p.y, until: performance.now() + 4000 }
          : null
        requestDraw()
      }
    }
  }
  if (pointers.size === 1) {
    // Pinch ended with one finger still down: keep panning from here.
    const [rest] = [...pointers.values()]
    drag = { x: rest!.x, y: rest!.y, cx, cy, moved: true }
    pinch = null
  } else if (pointers.size === 0) {
    drag = null
    pinch = null
    if (canvas.value) canvas.value.style.cursor = props.placing ? 'crosshair' : 'grab'
  }
}

/** Hover on a desktop: the heart shows its labels, a closed ring its label. */
function updateHover(p: { x: number; y: number }, x: number, y: number) {
  const onHeart = isHeartCell(x, y)
  const inWall = x >= 0 && y >= 0 && x < WALL_SIZE && y < WALL_SIZE
  const zone = inWall && !onHeart && !props.frameAt(x, y) ? zoneOfCell(x, y) : null
  const closedId = zone && props.closed.some((c) => c.id === zone.id) ? zone.id : null
  const before = `${heartHover}|${zoneTip?.id ?? ''}`
  heartHover = onHeart
  zoneTip = closedId ? { id: closedId, x: p.x, y: p.y, until: Infinity } : null
  pointerAt = p
  if (closedId || before !== `${heartHover}|${zoneTip?.id ?? ''}`) requestDraw()
}

function onPointerLeave() {
  if (pointerAt) {
    pointerAt = null
    heartHover = false
    zoneTip = null
    requestDraw()
  }
  if (props.placing && pointers.size === 0) emit('hover', null)
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const p = localPos(e)
  if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
    zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)))
  } else {
    cx += e.deltaX / s
    clampCenter()
    requestDraw()
  }
}

function onKey(e: KeyboardEvent) {
  const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
  if (step) {
    e.preventDefault()
    if (props.placing) {
      emit('nudge', { dx: step[0]!, dy: step[1]! })
    } else {
      cx += (step[0]! * 80) / s
      cy += (step[1]! * 80) / s
      clampCenter()
      requestDraw()
    }
  } else if (e.key === '+' || e.key === '=') {
    zoomBy(1.25)
  } else if (e.key === '-') {
    zoomBy(0.8)
  }
}

let observer: ResizeObserver | null = null

function resize() {
  const el = wrap.value, c = canvas.value
  if (!el || !c) return
  const r = el.getBoundingClientRect()
  width = r.width
  height = r.height
  dpr = window.devicePixelRatio || 1
  c.width = Math.round(width * dpr)
  c.height = Math.round(height * dpr)
  c.style.width = `${width}px`
  c.style.height = `${height}px`
  draw()
}

onMounted(() => {
  recount = setInterval(countPurchases, 60_000)
  observer = new ResizeObserver(resize)
  if (wrap.value) observer.observe(wrap.value)
  canvas.value?.addEventListener('wheel', onWheel, { passive: false })
  resize()
  // Webfonts arrive after the first paint; redraw so initials use them.
  document.fonts?.ready.then(() => requestDraw())
})

onBeforeUnmount(() => {
  if (recount) clearInterval(recount)
  if (sleepTimer) clearTimeout(sleepTimer)
  observer?.disconnect()
  canvas.value?.removeEventListener('wheel', onWheel)
})

// New frames (from the live feed) start a pulse from the heart and stay lit
// for a while. Frames already on the wall when it loads do not.
const { status: wallStatus } = useWall()
const known = new Set<number>()
let primed = false
function prime() {
  known.clear()
  for (const f of props.frames) known.add(f.id)
  primed = true
}
watch(wallStatus, (st) => {
  if (st === 'ready') prime()
  else primed = false
}, { immediate: true })
watch(() => props.frames, (list) => {
  if (!primed || wallStatus.value !== 'ready') return
  const now = performance.now()
  // Read storage too: a frame bought in another tab is yours before this tab hears of it.
  const mineSet = new Set([...props.mine, ...readMine()])
  // Queue after pulses still waiting, so a busy minute plays out one by one.
  const incoming = list.filter((f) => !known.has(f.id) && f.number !== null && !mineSet.has(f.id)).length
  // A rush plays faster, so it all fits in about 10 seconds.
  const gap = incoming > 10 ? Math.max(150, 10_000 / incoming) : PULSE_GAP_MS
  let at = Math.max(now, ...pulses.map((p) => p.at + gap))
  let added = false
  for (const f of list) {
    if (known.has(f.id)) continue
    known.add(f.id)
    // Only other people's frames pulse; yours are marked "You" instead.
    if (f.number === null || mineSet.has(f.id)) continue
    fresh.set(f.id, at)
    if (!reducedMotion) {
      pulses.push({ x: f.x + f.size / 2, y: f.y + f.size / 2, at })
      beatQueue.push(at)
    }
    at += gap
    added = true
  }
  if (added) requestDraw()
})

// The pace follows purchases in the last hour; recount as frames arrive and
// once a minute, as old purchases drop out of the hour.
watch(() => props.frames, () => {
  countPurchases()
  requestDraw()
}, { immediate: true })
let recount: ReturnType<typeof setInterval> | null = null

watch(() => [props.celebrate, props.frames] as const, ([id]) => {
  if (!id || ceremony?.id === id || !props.frames.some((f) => f.id === id)) return
  ceremony = { id, at: performance.now() }
  // The heart answers with a beat of its own.
  if (!reducedMotion) lastBeat = performance.now() + 300
  requestDraw()
}, { immediate: true })

watch(
  () => [props.selectedId, props.placing, props.mine, props.heartActive, props.highlightZone, props.frames, props.showZones, props.closed,
    props.ghost?.x, props.ghost?.y, props.ghost?.size, props.ghost?.valid],
  requestDraw,
)
</script>

<template>
  <div ref="wrap" class="wall">
    <canvas
      ref="canvas"
      class="wall__canvas"
      :class="{ 'wall__canvas--placing': placing }"
      tabindex="0"
      role="application"
      aria-label="The wall. Drag to move, scroll or pinch to zoom, arrow keys to pan."
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerLeave"
      @keydown="onKey"
    />
  </div>
</template>

<style scoped>
.wall {
  position: relative;
  background: #07050A;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
}
.wall__canvas {
  display: block;
  cursor: grab;
  outline: none;
}
.wall__canvas:focus-visible {
  box-shadow: inset 0 0 0 2px #FF5A6E;
}
.wall__canvas--placing {
  cursor: crosshair;
}
</style>

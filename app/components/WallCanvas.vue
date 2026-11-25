<script setup lang="ts">
import { CELL_PX, HEART, HEART_PRICE_FROM, isHeartCell, WALL_SIZE, ZONES } from '~/shared/wall'
import { tierOf } from '~/shared/tiers'
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
}>(), { selectedId: null, placing: false, ghost: null, ghostSize: 1, initialCellPx: 32, showZones: false, closed: () => [] })

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
// Zoomed all the way in, a cell is a little over its 100% size.
const MAX_CELL_PX = CELL_PX * 1.2

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

// Users who ask for less motion get a still heart.
const reducedMotion = import.meta.client && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Tiny deterministic noise for the embers: the same spark always rises the same way. */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

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
 * The legendary heart: molten gold-and-ember gradient that flows across it,
 * a breathing glow and sparks drifting up. Once someone owns it, their photo
 * shows through and the fire stays on the border.
 */
function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, taken: boolean, t: number) {
  const r = Math.min(size * 0.08, 8)
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2)

  // Glow.
  ctx.save()
  ctx.shadowColor = `rgba(240, 128, 40, ${0.45 + 0.3 * pulse})`
  ctx.shadowBlur = Math.min(Math.max(size * 0.35, 10), 64)
  roundRectPath(ctx, x, y, size, size, r)
  if (taken) {
    // The owner's photo is already drawn: glow around it, not over it.
    ctx.strokeStyle = '#E8762D'
    ctx.lineWidth = 2
    ctx.stroke()
  } else {
    ctx.fillStyle = '#E8762D'
    ctx.fill()
  }
  ctx.restore()

  // A flowing gradient. Its stops repeat every half, so sliding it by half its
  // length loops without a seam.
  const phase = (t * 0.18) % 1
  const len = size * 4
  const dx = 0.94, dy = -0.34 // up and to the right, unit length
  const back = (len / 2) * phase
  const gx = x - dx * back, gy = y + size - dy * back
  const flow = ctx.createLinearGradient(gx, gy, gx + dx * len, gy + dy * len)
  const stops = ['#C2401E', '#F08A2E', '#FFD36B', '#F08A2E', '#C2401E']
  for (let k = 0; k < 2; k++) {
    stops.forEach((c, i) => flow.addColorStop(Math.min(1, k * 0.5 + i * 0.125), c))
  }

  if (!taken) {
    ctx.fillStyle = flow
    roundRectPath(ctx, x, y, size, size, r)
    ctx.fill()
    // Hot core that breathes.
    const core = ctx.createRadialGradient(x + size / 2, y + size * 0.55, 0, x + size / 2, y + size * 0.55, size * 0.7)
    core.addColorStop(0, `rgba(255, 244, 200, ${0.35 + 0.35 * pulse})`)
    core.addColorStop(1, 'rgba(255, 244, 200, 0)')
    ctx.fillStyle = core
    roundRectPath(ctx, x, y, size, size, r)
    ctx.fill()
    if (size >= 20) {
      heartPath(ctx, x + size / 2, y + size / 2 + size * 0.03, size * (0.42 + 0.03 * pulse))
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
      ctx.fill()
    }
  }

  // Burning border, on the photo too.
  ctx.save()
  ctx.strokeStyle = flow
  ctx.lineWidth = Math.max(2, size * (taken ? 0.05 : 0.03))
  roundRectPath(ctx, x, y, size, size, r)
  ctx.stroke()
  ctx.restore()

  // Embers rising from the heart.
  if (size >= 24) {
    const n = 14
    for (let i = 0; i < n; i++) {
      const life = 1.6 + hash(i) * 1.6
      const p = ((t + hash(i + 50) * life) / life) % 1
      const ex = x + size * (0.1 + 0.8 * hash(i + 100)) + Math.sin(t * 2 + i) * size * 0.04
      const ey = y + size * 0.35 - p * size * 0.9
      const er = Math.max(1, size * 0.022) * (1 - p * 0.6)
      ctx.fillStyle = `rgba(255, ${170 + Math.round(60 * (1 - p))}, 90, ${(1 - p) * 0.85})`
      ctx.beginPath()
      ctx.arc(ex, ey, er, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

let hatch: CanvasPattern | null = null
function hatchPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (hatch) return hatch
  const tile = document.createElement('canvas')
  tile.width = 10
  tile.height = 10
  const t = tile.getContext('2d')
  if (!t) return null
  t.strokeStyle = 'rgba(24, 23, 28, 0.09)'
  t.lineWidth = 1.5
  t.beginPath()
  t.moveTo(-2, 12); t.lineTo(12, -2)
  t.moveTo(-2, 2); t.lineTo(2, -2)
  t.moveTo(8, 12); t.lineTo(12, 8)
  t.stroke()
  hatch = ctx.createPattern(tile, 'repeat')
  return hatch
}

/**
 * Rings that are not on sale yet: washed out and hatched, a solid fence
 * around the part that is open, and a label saying when each ring opens,
 * placed in the part of the ring nearest the middle of the screen.
 */
function drawClosed(ctx: CanvasRenderingContext2D, sx: (x: number) => number, sy: (y: number) => number) {
  if (!props.closed.length) return
  const closedIds = new Set(props.closed.map((c) => c.id))
  let fence: (typeof ZONES)[number] | null = null
  for (let i = 0; i < ZONES.length; i++) {
    const z = ZONES[i]!
    if (!closedIds.has(z.id)) continue
    const inner = ZONES[i - 1]
    if (inner && !closedIds.has(inner.id)) fence = inner
    ctx.save()
    ctx.beginPath()
    ctx.rect(sx(z.min), sy(z.min), (z.max - z.min + 1) * s, (z.max - z.min + 1) * s)
    if (inner) ctx.rect(sx(inner.min), sy(inner.min), (inner.max - inner.min + 1) * s, (inner.max - inner.min + 1) * s)
    ctx.fillStyle = 'rgba(233, 231, 224, 0.75)'
    ctx.fill('evenodd')
    const pattern = hatchPattern(ctx)
    if (pattern) {
      ctx.fillStyle = pattern
      ctx.fill('evenodd')
    }
    ctx.restore()
  }
  if (fence) {
    ctx.save()
    ctx.strokeStyle = 'rgba(24, 23, 28, 0.45)'
    ctx.lineWidth = 2
    ctx.strokeRect(sx(fence.min), sy(fence.min), (fence.max - fence.min + 1) * s, (fence.max - fence.min + 1) * s)
    ctx.restore()
  }

  for (let i = 0; i < ZONES.length; i++) {
    const z = ZONES[i]!
    const info = props.closed.find((c) => c.id === z.id)
    const inner = ZONES[i - 1]
    if (!info || !inner) continue
    const band = inner.min - z.min // ring thickness, in cells
    if (band * s < 56) continue
    // The point of the ring closest to the view center, pulled to the middle of the band.
    let px = cx, py = cy
    const lo = z.min, hi = z.max + 1, ilo = inner.min, ihi = inner.max + 1
    px = clamp(px, lo + band / 2, hi - band / 2)
    py = clamp(py, lo + band / 2, hi - band / 2)
    if (px > ilo && px < ihi && py > ilo && py < ihi) {
      const d = [px - ilo, ihi - px, py - ilo, ihi - py]
      const k = d.indexOf(Math.min(...d))
      if (k === 0) px = ilo - band / 2
      else if (k === 1) px = ihi + band / 2
      else if (k === 2) py = ilo - band / 2
      else py = ihi + band / 2
    }
    const X = clamp(sx(px), 140, width - 140), Y = clamp(sy(py), 40, height - 40)
    if (Y < sy(lo) || Y > sy(hi) || X < sx(lo) || X > sx(hi)) continue
    const big = Math.round(clamp(band * s * 0.12, 13, 17))
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `600 ${big}px 'Space Grotesk', Inter, sans-serif`
    const w = Math.max(ctx.measureText(info.title).width, (ctx.font = `400 ${big - 2}px Inter, sans-serif`, ctx.measureText(info.detail).width)) + 32
    const h = big * 2 + 26
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.strokeStyle = 'rgba(24, 23, 28, 0.12)'
    ctx.lineWidth = 1
    roundRectPath(ctx, X - w / 2, Y - h / 2, w, h, 10)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#18171C'
    ctx.font = `600 ${big}px 'Space Grotesk', Inter, sans-serif`
    ctx.fillText(info.title, X, Y - big / 2 - 2)
    ctx.fillStyle = '#5F5E5A'
    ctx.font = `400 ${big - 2}px Inter, sans-serif`
    ctx.fillText(info.detail, X, Y + big / 2 + 3)
    ctx.restore()
  }
}

function draw() {
  const c = canvas.value
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const sx = (x: number) => (x - cx) * s + width / 2
  const sy = (y: number) => (y - cy) * s + height / 2

  // Outside the wall, then the wall: zone by zone from the edge inwards, or
  // all in the edge colour when zones are hidden.
  ctx.fillStyle = '#E9E7E0'
  ctx.fillRect(0, 0, width, height)
  for (const z of props.showZones ? [...ZONES].reverse() : ZONES.slice(-1)) {
    ctx.fillStyle = tierOf(z.id).tint
    ctx.fillRect(sx(z.min), sy(z.min), (z.max - z.min + 1) * s, (z.max - z.min + 1) * s)
  }

  const x0 = Math.max(0, Math.floor(cx - width / 2 / s))
  const x1 = Math.min(WALL_SIZE, Math.ceil(cx + width / 2 / s))
  const y0 = Math.max(0, Math.floor(cy - height / 2 / s))
  const y1 = Math.min(WALL_SIZE, Math.ceil(cy + height / 2 / s))

  if (s >= 10) {
    ctx.strokeStyle = 'rgba(24, 23, 28, 0.06)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = x0; x <= x1; x++) {
      const px = Math.round(sx(x)) + 0.5
      ctx.moveTo(px, sy(y0)); ctx.lineTo(px, sy(y1))
    }
    for (let y = y0; y <= y1; y++) {
      const py = Math.round(sy(y)) + 0.5
      ctx.moveTo(sx(x0), py); ctx.lineTo(sx(x1), py)
    }
    ctx.stroke()
  }

  // Zone borders, each in its own tier colour.
  if (props.showZones) {
    ctx.save()
    ctx.setLineDash([6, 6])
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.6
    for (const z of ZONES) {
      if (z.id === 4) continue
      ctx.strokeStyle = tierOf(z.id).accent
      ctx.strokeRect(sx(z.min), sy(z.min), (z.max - z.min + 1) * s, (z.max - z.min + 1) * s)
    }
    ctx.restore()
  }
  ctx.strokeStyle = 'rgba(24, 23, 28, 0.25)'
  ctx.lineWidth = 1
  ctx.strokeRect(sx(0), sy(0), WALL_SIZE * s, WALL_SIZE * s)

  drawClosed(ctx, sx, sy)

  // Frames.
  const gap = s >= 6 ? 1 : 0
  for (const f of props.frames) {
    if (f.x + f.size < x0 || f.x > x1 || f.y + f.size < y0 || f.y > y1) continue
    const px = sx(f.x), py = sy(f.y), size = f.size * s
    ctx.fillStyle = f.color
    if (size >= 6) {
      roundRectPath(ctx, px + gap / 2, py + gap / 2, size - gap, size - gap, Math.min(3, size / 8))
      ctx.fill()
      ctx.strokeStyle = 'rgba(24, 23, 28, 0.14)'
      ctx.lineWidth = 1
      ctx.stroke()
    } else {
      ctx.fillRect(px, py, Math.max(size, 0.8), Math.max(size, 0.8))
    }
    const img = f.photoUrl && size >= 8 ? photo(f.photoUrl) : null
    if (img) {
      ctx.save()
      roundRectPath(ctx, px + gap / 2, py + gap / 2, size - gap, size - gap, Math.min(3, size / 8))
      ctx.clip()
      ctx.drawImage(img, px, py, size, size)
      ctx.restore()
    } else if (size >= 28) {
      ctx.fillStyle = f.ink
      ctx.font = `600 ${Math.round(Math.min(size * 0.36, 30))}px 'Space Grotesk', Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(f.initials, px + size / 2, py + size / 2 + 1)
    }
    if (f.id === props.selectedId) {
      ctx.strokeStyle = '#18171C'
      ctx.lineWidth = 2
      ctx.strokeRect(px - 2, py - 2, size + 4, size + 4)
    }
  }

  // The heart: always burning, and the only thing on the wall that moves.
  const hx = sx(HEART.x), hy = sy(HEART.y), hs = Math.max(HEART.size * s, 6)
  const heartTaken = !!props.frameAt(HEART.x, HEART.y)
  const heartVisible = hx + hs > -80 && hy + hs > -80 && hx < width + 80 && hy < height + 80
  if (heartVisible) drawHeart(ctx, hx, hy, hs, heartTaken, reducedMotion ? 0 : performance.now() / 1000)
  if (s >= 3) {
    const label = heartTaken ? 'The heart' : `The heart · from $${HEART_PRICE_FROM.toLocaleString('en-US')}`
    ctx.font = "500 12px Inter, system-ui, sans-serif"
    const tw = ctx.measureText(label).width + 24
    const lx = hx + hs / 2 - tw / 2, ly = hy - 40
    ctx.fillStyle = '#D85A30'
    roundRectPath(ctx, lx, ly, tw, 26, 13)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, lx + tw / 2, ly + 13.5)
  }
  // Keep the flame alive while the heart is on screen.
  if (heartVisible && !reducedMotion) requestDraw()

  // Ghost of the frame being placed.
  const g = props.ghost
  if (g) {
    const gx = sx(g.x), gy = sy(g.y), gs = Math.max(g.size * s, 4)
    ctx.fillStyle = g.valid ? 'rgba(250, 199, 117, 0.6)' : 'rgba(226, 75, 74, 0.25)'
    ctx.fillRect(gx, gy, gs, gs)
    ctx.save()
    ctx.setLineDash([4, 3])
    ctx.strokeStyle = g.valid ? '#BA7517' : '#E24B4A'
    ctx.lineWidth = 2
    ctx.strokeRect(gx, gy, gs, gs)
    ctx.restore()
    ctx.strokeStyle = g.valid ? 'rgba(239, 159, 39, 0.3)' : 'rgba(226, 75, 74, 0.3)'
    ctx.lineWidth = 4
    ctx.strokeRect(gx - 4, gy - 4, gs + 8, gs + 8)
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

defineExpose({ zoomBy, centerOn })

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

function onPointerLeave() {
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
  observer = new ResizeObserver(resize)
  if (wrap.value) observer.observe(wrap.value)
  canvas.value?.addEventListener('wheel', onWheel, { passive: false })
  resize()
  // Webfonts arrive after the first paint; redraw so initials use them.
  document.fonts?.ready.then(() => requestDraw())
})

onBeforeUnmount(() => {
  observer?.disconnect()
  canvas.value?.removeEventListener('wheel', onWheel)
})

watch(
  () => [props.selectedId, props.placing, props.frames, props.showZones, props.closed,
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
  box-shadow: inset 0 0 0 2px #534AB7;
}
.wall__canvas--placing {
  cursor: crosshair;
}
</style>

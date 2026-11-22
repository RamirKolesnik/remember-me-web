<script setup lang="ts">
import { HEART, HEART_PRICE, WALL_SIZE, ZONES } from '~/shared/wall'
import type { WallFrame } from '~/composables/useWall'

export interface Ghost { x: number; y: number; size: number; valid: boolean }
export interface WallView { cx: number; cy: number; w: number; h: number }

const props = withDefaults(defineProps<{
  frames: WallFrame[]
  frameAt: (x: number, y: number) => WallFrame | null
  selectedId?: number | null
  /** Placement mode: taps pick a spot instead of opening frames. */
  placing?: boolean
  ghost?: Ghost | null
  ghostSize?: number
  initialCellPx?: number
}>(), { selectedId: null, placing: false, ghost: null, ghostSize: 1, initialCellPx: 16 })

const emit = defineEmits<{
  select: [frame: WallFrame | null]
  pick: [cell: { x: number; y: number }]
  hover: [cell: { x: number; y: number } | null]
  nudge: [delta: { dx: number; dy: number }]
  view: [view: WallView]
}>()

const MIN_CELL_PX = 0.6
const MAX_CELL_PX = 48
const ZONE_FILL: Record<number, string> = { 1: '#E9E6FA', 2: '#F0EEFC', 3: '#F6F5FD', 4: '#FBFAF7' }

const wrap = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

// View state: the cell at the center of the screen and the size of a cell in CSS px.
let cx = HEART.x + 0.5
let cy = HEART.y + 0.5
let s = props.initialCellPx
let width = 0
let height = 0
let dpr = 1
let frameRequested = false

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

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

function draw() {
  const c = canvas.value
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const sx = (x: number) => (x - cx) * s + width / 2
  const sy = (y: number) => (y - cy) * s + height / 2

  // Outside the wall, then the zones from the edge inwards.
  ctx.fillStyle = '#E9E7E0'
  ctx.fillRect(0, 0, width, height)
  for (const z of [...ZONES].reverse()) {
    ctx.fillStyle = ZONE_FILL[z.id]!
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

  // Zone borders.
  ctx.save()
  ctx.setLineDash([6, 6])
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(127, 119, 221, 0.55)'
  for (const z of ZONES) {
    if (z.id === 4) continue
    ctx.strokeRect(sx(z.min), sy(z.min), (z.max - z.min + 1) * s, (z.max - z.min + 1) * s)
  }
  ctx.restore()
  ctx.strokeStyle = 'rgba(24, 23, 28, 0.25)'
  ctx.lineWidth = 1
  ctx.strokeRect(sx(0), sy(0), WALL_SIZE * s, WALL_SIZE * s)

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
    if (size >= 28) {
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

  // The heart.
  const hx = sx(HEART.x), hy = sy(HEART.y), hs = Math.max(s, 3)
  const heartTaken = props.frameAt(HEART.x, HEART.y)
  if (!heartTaken) {
    ctx.fillStyle = 'rgba(216, 90, 48, 0.18)'
    ctx.fillRect(hx - 4, hy - 4, hs + 8, hs + 8)
    ctx.fillStyle = '#FAECE7'
    ctx.fillRect(hx, hy, hs, hs)
  }
  ctx.strokeStyle = '#D85A30'
  ctx.lineWidth = Math.max(1.5, s * 0.12)
  ctx.strokeRect(hx, hy, hs, hs)
  if (s >= 3) {
    const label = heartTaken ? 'The heart' : `The heart · $${HEART_PRICE.toLocaleString('en-US')}`
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
      canvas.value.style.cursor = props.frameAt(Math.floor(fx), Math.floor(fy)) ? 'pointer' : 'grab'
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
      emit('select', props.frameAt(Math.floor(fx), Math.floor(fy)))
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
  () => [props.selectedId, props.placing, props.frames.length,
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

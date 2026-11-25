// Blood vessels of the living wall: stair-step paths that run along the seams
// between cells, from the heart out towards the edge. They are generated from
// a fixed seed, so every visitor sees the same wall.
//
// A vessel is a list of grid nodes (cell corners, 0..WALL_SIZE) joined by
// horizontal and vertical segments. `width` is relative: 1 for a main vessel,
// less for its branches.

import { HEART, WALL_SIZE } from './wall.ts'

export interface Vessel {
  /** Flat list of grid nodes: x0, y0, x1, y1, ... */
  points: number[]
  width: number
}

function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

const clampNode = (v: number) => Math.min(WALL_SIZE, Math.max(0, v))

export function makeVessels(seed = 4812): Vessel[] {
  const r = rng(seed)
  const out: Vessel[] = []
  const c = HEART.x + HEART.size / 2
  const half = HEART.size / 2
  const inHeart = (x: number, y: number) =>
    x > HEART.x && x < HEART.x + HEART.size && y > HEART.y && y < HEART.y + HEART.size

  // A stair-step walk that heads towards `angle`, wandering a little, like a
  // vessel finding its way between the photos.
  function grow(x: number, y: number, angle: number, width: number, depth: number, budget: number) {
    const pts = [x, y]
    let len = 0
    while (len < budget) {
      angle += (r() - 0.5) * 0.22
      const ax = Math.cos(angle), ay = Math.sin(angle)
      const run = 1 + Math.floor(r() * 5)
      let nx = x, ny = y
      if (r() < Math.abs(ax) / (Math.abs(ax) + Math.abs(ay))) nx = clampNode(x + Math.sign(ax) * run)
      else ny = clampNode(y + Math.sign(ay) * run)
      if (inHeart(nx, ny) || (nx === x && ny === y)) break
      len += Math.abs(nx - x) + Math.abs(ny - y)
      x = nx; y = ny
      // Merge straight runs into one segment.
      const n = pts.length
      if (n >= 4 && ((pts[n - 2] === pts[n - 4] && x === pts[n - 2]) || (pts[n - 1] === pts[n - 3] && y === pts[n - 1]))) {
        pts[n - 2] = x; pts[n - 1] = y
      } else {
        pts.push(x, y)
      }
      if (x === 0 || y === 0 || x === WALL_SIZE || y === WALL_SIZE) break
      if (depth < 2 && r() < (depth === 0 ? 0.014 : 0.01)) {
        const turn = (r() < 0.5 ? -1 : 1) * (0.4 + r() * 0.6)
        grow(x, y, angle + turn, width * 0.6, depth + 1, 30 + r() * (depth === 0 ? 200 : 70))
      }
    }
    if (pts.length >= 4) out.push({ points: pts, width })
  }

  // Main vessels leave the heart in every direction, from its border.
  const MAIN = 14
  for (let i = 0; i < MAIN; i++) {
    const angle = (i / MAIN) * Math.PI * 2 + (r() - 0.5) * 0.3
    const t = half / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)))
    const x = Math.round(c + Math.cos(angle) * t), y = Math.round(c + Math.sin(angle) * t)
    grow(x, y, angle, 1, 0, WALL_SIZE * 0.75)
  }
  return out
}

// "Claim a spot nearby": the free cells closest to a frame, nearest first.

export interface Cell { x: number; y: number }

/**
 * Up to `n` cells around (x, y) that `ok` accepts, nearest first (by straight
 * distance, ties by angle so the list reads round the frame). Looks out ring
 * by ring up to `maxRing` cells away.
 */
export function nearestFree(x: number, y: number, ok: (x: number, y: number) => boolean, n = 8, maxRing = 40): Cell[] {
  const found: (Cell & { d: number; a: number })[] = []
  for (let r = 1; r <= maxRing; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        if (ok(x + dx, y + dy)) found.push({ x: x + dx, y: y + dy, d: Math.hypot(dx, dy), a: Math.atan2(dy, dx) })
      }
    }
    // A ring further out can still hold a closer cell (its corners are far,
    // its middle is not), so keep going until the n-th best is inside this ring.
    if (found.length >= n) {
      found.sort((p, q) => p.d - q.d || p.a - q.a)
      if (found[n - 1]!.d <= r) break
    }
  }
  found.sort((p, q) => p.d - q.d || p.a - q.a)
  return found.slice(0, n).map(({ x: cx, y: cy }) => ({ x: cx, y: cy }))
}

/** "300,412" → { x: 300, y: 412 }; anything else → null. */
export function parseCell(s: unknown): Cell | null {
  if (typeof s !== 'string') return null
  const m = /^(\d{1,4}),(\d{1,4})$/.exec(s.trim())
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null
}

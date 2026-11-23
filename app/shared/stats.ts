// How full the wall and each of its zones are. Zones are rings: zone 2 is its
// square minus zone 1, and so on, so the four totals add up to the whole wall.

import { WALL_SIZE, ZONES, zoneOfCell, type Zone } from './wall.ts'

export interface ZoneFill {
  zone: Zone
  taken: number
  total: number
}

export interface WallFill {
  taken: number
  total: number
  zones: ZoneFill[]
}

const side = (z: Zone) => z.max - z.min + 1

/** Cells in each zone ring, most expensive first. */
export const ZONE_CELLS: readonly number[] = ZONES.map((z, i) =>
  side(z) ** 2 - (i > 0 ? side(ZONES[i - 1]!) ** 2 : 0))

/**
 * Counts taken cells per zone. A frame on a zone border counts each of its
 * cells in the zone that cell lies in, so the totals match the real area.
 */
export function wallFill(frames: readonly { x: number; y: number; size: number }[]): WallFill {
  const taken = ZONES.map(() => 0)
  for (const f of frames) {
    for (let a = 0; a < f.size; a++) {
      for (let b = 0; b < f.size; b++) taken[zoneOfCell(f.x + a, f.y + b).id - 1]!++
    }
  }
  return {
    taken: taken.reduce((s, n) => s + n, 0),
    total: WALL_SIZE * WALL_SIZE,
    zones: ZONES.map((zone, i) => ({ zone, taken: taken[i]!, total: ZONE_CELLS[i]! })),
  }
}

/** "0%", "<0.1%", "0.4%", "12%", "100%": small shares stay visible. */
export function formatShare(taken: number, total: number): string {
  if (taken <= 0 || total <= 0) return '0%'
  const p = (taken / total) * 100
  if (p >= 100) return '100%'
  if (p < 0.1) return '<0.1%'
  if (p < 10) return `${Math.floor(p * 10) / 10}%`
  return `${Math.floor(p)}%`
}

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatShare, wallFill, ZONE_CELLS } from '../app/shared/stats.ts'

test('zone rings add up to the whole wall', () => {
  assert.deepEqual(ZONE_CELLS, [10_000, 80_000, 270_000, 644_004])
  assert.equal(ZONE_CELLS.reduce((s, n) => s + n, 0), 1002 * 1002)
})

test('an empty wall is empty everywhere', () => {
  const fill = wallFill([])
  assert.equal(fill.taken, 0)
  assert.equal(fill.total, 1002 * 1002)
  assert.deepEqual(fill.zones.map((z) => z.taken), [0, 0, 0, 0])
})

test('frames count their cells in the zone each cell lies in', () => {
  const fill = wallFill([
    { x: 500, y: 500, size: 1 }, // the heart, zone 1
    { x: 0, y: 0, size: 3 }, // corner, zone 4
    { x: 450, y: 450, size: 2 }, // across the zone 1/2 border: 1 cell in zone 1, 3 in zone 2
  ])
  assert.equal(fill.taken, 14)
  assert.deepEqual(fill.zones.map((z) => z.taken), [2, 3, 0, 9])
  assert.deepEqual(fill.zones.map((z) => z.zone.id), [1, 2, 3, 4])
})

test('shares stay readable when tiny', () => {
  assert.equal(formatShare(0, 100), '0%')
  assert.equal(formatShare(1, 1_000_000), '<0.1%')
  assert.equal(formatShare(3_237, 1_000_000), '0.3%')
  assert.equal(formatShare(1_234, 10_000), '12%')
  assert.equal(formatShare(999, 1_000), '99%')
  assert.equal(formatShare(10_000, 10_000), '100%')
})

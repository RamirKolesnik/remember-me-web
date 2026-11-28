import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  HEART, HEART_NEIGHBOURS, isHeartNeighbour, luckyKind, milestonesOf, NO_MILESTONES, tagsOf, WAVE_UNLOCK_SHARE, ZONES,
  type Milestones,
} from '../app/shared/wall.ts'

const ids = (f: { number: number | null; x: number; y: number; size: number }, m: Milestones | null) =>
  tagsOf(f, m).map((t) => t.id)

test('lucky numbers', () => {
  assert.equal(luckyKind(1), 'one')
  for (const n of [111, 777, 4444, 99999]) assert.equal(luckyKind(n), 'repdigit', String(n))
  for (const n of [100, 500, 1000, 20000, 1000000]) assert.equal(luckyKind(n), 'round', String(n))
  for (const n of [123, 1234, 12345, 123456789]) assert.equal(luckyKind(n), 'straight', String(n))
  for (const n of [2, 11, 99, 101, 1001, 124, 4812, 0, -7, null, undefined]) assert.equal(luckyKind(n as number), null, String(n))
})

test('heart neighbours ring the heart', () => {
  let n = 0
  for (let x = HEART.x - 3; x < HEART.x + HEART.size + 3; x++) {
    for (let y = HEART.y - 3; y < HEART.y + HEART.size + 3; y++) if (isHeartNeighbour(x, y, 1)) n++
  }
  assert.equal(n, HEART_NEIGHBOURS)
  assert.equal(HEART_NEIGHBOURS, 52)
  assert.ok(isHeartNeighbour(HEART.x - 1, HEART.y - 1, 1))
  assert.ok(isHeartNeighbour(HEART.x + HEART.size, HEART.y + 5, 1))
  assert.ok(!isHeartNeighbour(HEART.x - 2, HEART.y, 1))
  assert.ok(!isHeartNeighbour(HEART.x, HEART.y, 1))
  assert.ok(!isHeartNeighbour(HEART.x, HEART.y, HEART.size))
})

test('milestones: first in zone, last spot, end of the first wave', () => {
  const z1 = ZONES[0]!, z2 = ZONES[1]!
  const empty = milestonesOf([])
  assert.deepEqual(empty, NO_MILESTONES)

  const frames: { number: number; x: number; y: number; size: number }[] = []
  // Zone 2 first (#1), then zone 1 (#2): order on the wall is by number, not by list order.
  frames.push({ number: 2, x: 500, y: 460, size: 1 }, { number: 1, x: 400, y: 400, size: 1 })
  const m = milestonesOf(frames)
  assert.equal(m.zones[1].first, 2)
  assert.equal(m.zones[2].first, 1)
  assert.equal(m.zones[3].first, null)
  assert.equal(m.zones[1].last, null)
  assert.equal(m.firstWaveLast, null)

  // Fill zone 1 entirely: its last frame is the last spot.
  const all: { number: number; x: number; y: number; size: number }[] = []
  let n = 0
  for (let x = z1.min; x <= z1.max; x++) {
    for (let y = z1.min; y <= z1.max; y++) {
      if (x >= HEART.x && x < HEART.x + HEART.size && y >= HEART.y && y < HEART.y + HEART.size) continue
      all.push({ number: ++n, x, y, size: 1 })
    }
  }
  assert.equal(n, z1.capacity)
  const full = milestonesOf(all)
  assert.equal(full.zones[1].first, 1)
  assert.equal(full.zones[1].last, z1.capacity)

  // Then zone 2 up to the point where wave 2 opens.
  const unlockAt = Math.ceil((z1.capacity + z2.capacity) * WAVE_UNLOCK_SHARE)
  outer: for (let x = z2.min; x <= z2.max; x++) {
    for (let y = z2.min; y <= z2.max; y++) {
      if (x >= z1.min && x <= z1.max && y >= z1.min && y <= z1.max) continue
      if (n === unlockAt + 3) break outer
      all.push({ number: ++n, x, y, size: 1 })
    }
  }
  assert.equal(milestonesOf(all).firstWaveLast, unlockAt)
  // The heart is in no zone.
  assert.deepEqual(milestonesOf([{ number: 9, x: HEART.x, y: HEART.y, size: HEART.size }]), NO_MILESTONES)
})

test('tags of a frame', () => {
  const m: Milestones = {
    firstWaveLast: 50_000,
    zones: { 1: { first: 7, last: null }, 2: { first: 3, last: 89_998 }, 3: { first: 60_000, last: null }, 4: { first: null, last: null } },
  }
  assert.deepEqual(ids({ number: 7, x: 500, y: 460, size: 1 }, m), ['founder', 'first-in-zone', 'first-wave'])
  assert.deepEqual(ids({ number: 89_998, x: 400, y: 400, size: 1 }, m), ['last-spot'])
  assert.deepEqual(ids({ number: 4812, x: 400, y: 400, size: 1 }, m), ['first-wave'])
  assert.deepEqual(ids({ number: 77_777, x: 300, y: 300, size: 1 }, m), ['lucky'])
  assert.deepEqual(ids({ number: 60_000, x: 300, y: 300, size: 1 }, m), ['first-in-zone', 'lucky'])
  assert.deepEqual(ids({ number: 1, x: HEART.x - 1, y: HEART.y, size: 1 }, m), ['founder', 'first-wave', 'lucky', 'heart-neighbour'])
  // While wave 2 is closed, every frame is from the first wave.
  assert.deepEqual(ids({ number: 4812, x: 400, y: 400, size: 1 }, { ...m, firstWaveLast: null }), ['first-wave'])
  // Without milestones only the frame's own tags.
  assert.deepEqual(ids({ number: 7, x: 500, y: 460, size: 1 }, null), ['founder'])
  // The heart gets no zone tags.
  assert.deepEqual(ids({ number: 1500, x: HEART.x, y: HEART.y, size: HEART.size }, m), [])
  assert.equal(tagsOf({ number: 1, x: 0, y: 0, size: 1 }, null).find((t) => t.id === 'lucky')?.label, 'Number one')
})

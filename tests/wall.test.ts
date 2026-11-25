import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CELL_PX, containsLink, formatUsd, HEART, HEART_PRICE_FROM, isFounder, isHeart, isHeartCell, isOpenCell, NOTHING_SOLD,
  overlapsHeart, placementError, priceOf, pricing, zoneOfCell, zoneOfFrame, zonePrice, ZONES,
} from '../app/shared/wall.ts'

test('zones are nested squares around the center', () => {
  assert.equal(zoneOfCell(500, 500).id, 1)
  assert.equal(zoneOfCell(450, 549).id, 1)
  assert.equal(zoneOfCell(449, 500).id, 2)
  assert.equal(zoneOfCell(350, 649).id, 2)
  assert.equal(zoneOfCell(349, 500).id, 3)
  assert.equal(zoneOfCell(200, 200).id, 3)
  assert.equal(zoneOfCell(199, 500).id, 4)
  assert.equal(zoneOfCell(0, 999).id, 4)
})

test('a cell is 80 px and the heart block sits in the dearest zone', () => {
  assert.equal(CELL_PX, 80)
  assert.equal(zoneOfFrame(498, 498, 4).id, 1)
  assert.equal(zoneOfFrame(448, 500, 3).id, 1)
})

test('prices print the way buyers read them', () => {
  assert.equal(formatUsd(499), '$4.99')
  assert.equal(formatUsd(2499), '$24.99')
  assert.equal(formatUsd(9900), '$99')
  assert.equal(formatUsd(1_000_000), '$10,000')
})

test('the heart is a 4x4 block at the center, not for sale on the site', () => {
  assert.deepEqual(HEART, { x: 498, y: 498, size: 4 })
  // Centered: as many cells on each side of it.
  assert.equal(HEART.x, 1000 - (HEART.x + HEART.size))
  assert.equal(HEART_PRICE_FROM, 10_000)
  assert.ok(isHeart(498, 498, 4))
  assert.ok(!isHeart(500, 500, 1))
  for (const [x, y] of [[498, 498], [501, 501], [498, 501], [500, 499]]) {
    assert.ok(isHeartCell(x!, y!), `${x},${y} is in the heart`)
    assert.equal(placementError(x!, y!), 'heart_not_for_sale')
  }
  assert.equal(placementError(497, 497), null)
  assert.equal(placementError(502, 498), null)
  assert.equal(placementError(497, 502), null)
  assert.ok(overlapsHeart(496, 496, 3) && !overlapsHeart(495, 495, 3))
  assert.ok(!isHeartCell(497, 500) && !isHeartCell(502, 500))
})

test('bounds', () => {
  assert.equal(placementError(999, 999), null)
  assert.equal(placementError(1000, 0), 'out_of_bounds')
  assert.equal(placementError(-1, 0), 'out_of_bounds')
  assert.equal(placementError(1.5, 0), 'out_of_bounds')
})

test('links are caught, handles are not', () => {
  for (const t of ['see https://x.com', 'www.site.org', 'go to mysite.com', 'mysite dot com', 'shop(dot)uz', 'example . io']) {
    assert.equal(containsLink(t), true, t)
  }
  for (const t of ['Say hi — @aziza.draws', 'Was here. 2026.', 'I love dots...', '@name.me on insta', 'v1.0 forever']) {
    assert.equal(containsLink(t), false, t)
  }
})

test('zones hold the whole wall, minus the heart', () => {
  assert.equal(ZONES.reduce((s, z) => s + z.capacity, 0), 1_000_000 - 16)
  assert.deepEqual(ZONES.map((z) => z.capacity), [9_984, 80_000, 270_000, 640_000])
})

test('launch: only the center is open, at the first step', () => {
  const p = pricing(NOTHING_SOLD)
  assert.deepEqual(p.waves.map((w) => w.open), [true, false, false])
  assert.deepEqual(p.zones.map((z) => z.open), [true, true, false, false])
  assert.deepEqual(p.zones.map((z) => z.priceCents), [2900, 299, 199, 149])
  assert.equal(p.zones[0]!.nextPriceCents, 3900)
  assert.equal(p.zones[0]!.leftAtPrice, 1997) // a fifth of 9,984, rounded up
  assert.equal(p.foundersLeft, 1000)
  assert.equal(priceOf(500, 470, p), 2900)
  assert.equal(priceOf(400, 400, p), 299)
  assert.ok(isOpenCell(400, 400, p))
  assert.ok(!isOpenCell(250, 250, p) && !isOpenCell(10, 10, p))
})

test('the price steps up each fifth of a zone', () => {
  const at = (n: number) => zonePrice(pricing({ ...NOTHING_SOLD, 2: n }), 2)
  assert.equal(at(15_999).priceCents, 299)
  assert.equal(at(15_999).leftAtPrice, 1)
  assert.equal(at(16_000).priceCents, 399)
  assert.equal(at(16_000).leftAtPrice, 16_000)
  assert.equal(at(64_000).priceCents, 999)
  assert.equal(at(64_000).nextPriceCents, null)
  assert.equal(at(64_000).leftAtPrice, 16_000) // last step: what is left of the zone
  assert.equal(at(80_000).leftAtPrice, 0)
})

test('waves open from the center out, at half sold', () => {
  const w1 = Math.ceil((9_984 + 80_000) / 2)
  assert.equal(pricing({ 1: 9_984, 2: w1 - 9_984 - 1, 3: 0, 4: 0 }).waves[1]!.open, false)
  const p = pricing({ 1: 9_984, 2: w1 - 9_984, 3: 0, 4: 0 })
  assert.equal(p.waves[1]!.open, true)
  assert.equal(p.waves[2]!.open, false)
  assert.equal(p.waves[1]!.unlockAt, 135_000)
  assert.equal(pricing({ 1: 9_984, 2: 80_000, 3: 135_000, 4: 0 }).waves[2]!.open, true)
  // A wave never opens before the one inside it.
  assert.equal(pricing({ 1: 0, 2: 0, 3: 270_000, 4: 0 }).waves[2]!.open, false)
})

test('the first 1,000 frames are founders', () => {
  assert.ok(isFounder(1) && isFounder(1000))
  assert.ok(!isFounder(1001) && !isFounder(null) && !isFounder(0))
  assert.equal(pricing({ 1: 300, 2: 500, 3: 0, 4: 0 }).foundersLeft, 200)
  assert.equal(pricing({ 1: 900, 2: 500, 3: 0, 4: 0 }).foundersLeft, 0)
})

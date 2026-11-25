import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CELL_PX, containsLink, formatUsd, HEART, HEART_PRICE_FROM, isHeart, isHeartCell, overlapsHeart, placementError,
  priceOf, zoneOfCell, zoneOfFrame,
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

test('one price per zone, in cents', () => {
  assert.equal(priceOf(470, 470), 9900) // epic, center
  assert.equal(priceOf(400, 400), 2499) // rare
  assert.equal(priceOf(250, 250), 999) // uncommon
  assert.equal(priceOf(10, 10), 499) // common, edge
  // Zone borders: the last cell inside and the first outside.
  assert.equal(priceOf(450, 549), 9900)
  assert.equal(priceOf(449, 549), 2499)
  assert.equal(priceOf(199, 500), 499)
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

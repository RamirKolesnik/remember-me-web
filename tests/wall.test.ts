import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  containsLink, HEART_PRICE, placementError, priceOf, zoneOfCell, zoneOfFrame,
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

test('price table from the brief', () => {
  assert.equal(priceOf(470, 470, 1), 15)
  assert.equal(priceOf(470, 470, 2), 30)
  assert.equal(priceOf(470, 470, 3), 55)
  assert.equal(priceOf(400, 400, 1), 9)
  assert.equal(priceOf(250, 250, 2), 12)
  assert.equal(priceOf(10, 10, 3), 11)
})

test('a frame on a zone border is priced by the dearer zone', () => {
  assert.equal(zoneOfFrame(448, 500, 3).id, 1)
  assert.equal(priceOf(448, 500, 3), 55)
  assert.equal(zoneOfFrame(447, 500, 3).id, 2)
})

test('the heart', () => {
  assert.equal(priceOf(500, 500, 1), HEART_PRICE)
  assert.equal(priceOf(501, 500, 1), 15)
  assert.equal(placementError(499, 499, 2), 'heart_needs_1x1')
  assert.equal(placementError(498, 498, 3), 'heart_needs_1x1')
  assert.equal(placementError(500, 500, 1), null)
})

test('bounds', () => {
  assert.equal(placementError(998, 0, 3), 'out_of_bounds')
  assert.equal(placementError(997, 997, 3), null)
  assert.equal(placementError(-1, 0, 1), 'out_of_bounds')
  assert.equal(placementError(1.5, 0, 1), 'out_of_bounds')
})

test('links are caught, handles are not', () => {
  for (const t of ['see https://x.com', 'www.site.org', 'go to mysite.com', 'mysite dot com', 'shop(dot)uz', 'example . io']) {
    assert.equal(containsLink(t), true, t)
  }
  for (const t of ['Say hi — @aziza.draws', 'Was here. 2026.', 'I love dots...', '@name.me on insta', 'v1.0 forever']) {
    assert.equal(containsLink(t), false, t)
  }
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nearestFree, parseCell } from '../app/shared/nearby.ts'

test('nearest free cells, closest first', () => {
  const all = () => true
  const got = nearestFree(10, 10, all, 4)
  assert.equal(got.length, 4)
  // The four sides come before the corners.
  for (const c of got) assert.equal(Math.abs(c.x - 10) + Math.abs(c.y - 10), 1)
  assert.equal(nearestFree(10, 10, all, 8).length, 8)
})

test('skips taken cells and looks further out', () => {
  const taken = new Set(['9,10', '11,10', '10,9', '10,11', '9,9', '11,11', '9,11', '11,9'])
  const got = nearestFree(10, 10, (x, y) => !taken.has(`${x},${y}`), 3)
  assert.equal(got.length, 3)
  for (const c of got) assert.equal(Math.max(Math.abs(c.x - 10), Math.abs(c.y - 10)), 2)
  // Straight out (2 away) beats a knight's step (√5).
  assert.equal(Math.hypot(got[0]!.x - 10, got[0]!.y - 10), 2)
  assert.deepEqual(nearestFree(10, 10, () => false, 3, 5), [])
})

test('parse a cell from the address', () => {
  assert.deepEqual(parseCell('300,412'), { x: 300, y: 412 })
  assert.deepEqual(parseCell(' 0,1001 '), { x: 0, y: 1001 })
  for (const s of ['300', 'a,b', '1,2,3', '-1,2', undefined, 5]) assert.equal(parseCell(s), null)
})

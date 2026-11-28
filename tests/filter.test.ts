import { test } from 'node:test'
import assert from 'node:assert/strict'
import { boundsOf, filterLabel, matchesFilter, TAG_STYLE } from '../app/shared/tags.ts'
import { HEART, NO_MILESTONES } from '../app/shared/wall.ts'

test('filter by zone or tag', () => {
  const f = { number: 777, x: HEART.x - 1, y: HEART.y, size: 1 }
  assert.ok(matchesFilter(f, { kind: 'zone', id: 1 }, null))
  assert.ok(!matchesFilter(f, { kind: 'zone', id: 2 }, null))
  assert.ok(matchesFilter(f, { kind: 'tag', id: 'founder' }, null))
  assert.ok(matchesFilter(f, { kind: 'tag', id: 'lucky' }, null))
  assert.ok(matchesFilter(f, { kind: 'tag', id: 'heart-neighbour' }, null))
  assert.ok(!matchesFilter(f, { kind: 'tag', id: 'first-wave' }, null), 'needs milestones')
  assert.ok(matchesFilter(f, { kind: 'tag', id: 'first-wave' }, NO_MILESTONES))
  // The heart is in no zone.
  assert.ok(!matchesFilter({ number: 5, x: HEART.x, y: HEART.y, size: HEART.size }, { kind: 'zone', id: 1 }, null))
})

test('labels and bounds', () => {
  assert.equal(filterLabel({ kind: 'zone', id: 3 }), 'The Veins')
  assert.equal(filterLabel({ kind: 'tag', id: 'founder' }), 'Founders')
  assert.equal(Object.keys(TAG_STYLE).length, 6)
  assert.equal(boundsOf([]), null)
  assert.deepEqual(boundsOf([{ number: 1, x: 10, y: 20, size: 1 }, { number: 2, x: 5, y: 30, size: 1 }]), { x0: 5, y0: 20, x1: 10, y1: 30 })
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { boundsOf, FILTER_TAGS, hasTag, isFilterTag, tagCounts, TAG_STYLE } from '../app/shared/tags.ts'
import { HEART, NO_MILESTONES } from '../app/shared/wall.ts'

test('the filter bar has every tag but first wave', () => {
  assert.deepEqual([...FILTER_TAGS].sort(), Object.keys(TAG_STYLE).filter((k) => k !== 'first-wave').sort())
  assert.ok(!isFilterTag('first-wave'))
  assert.ok(isFilterTag('founder'))
})

test('has tag and counts', () => {
  const near = { number: 777, x: HEART.x - 1, y: HEART.y, size: 1 }
  const far = { number: 4812, x: 400, y: 400, size: 1 }
  assert.ok(hasTag(near, 'founder', null))
  assert.ok(hasTag(near, 'lucky', null))
  assert.ok(!hasTag(far, 'founder', null))
  assert.ok(!hasTag(near, 'first-wave', null), 'needs milestones')
  const c = tagCounts([near, far], NO_MILESTONES)
  assert.equal(c.founder, 1)
  assert.equal(c['heart-neighbour'], 1)
  assert.equal(c['first-wave'], 2)
  assert.equal(c['last-spot'], 0)
})

test('bounds', () => {
  assert.equal(boundsOf([]), null)
  assert.deepEqual(boundsOf([{ number: 1, x: 10, y: 20, size: 1 }, { number: 2, x: 5, y: 30, size: 1 }]), { x0: 5, y0: 20, x1: 10, y1: 30 })
})

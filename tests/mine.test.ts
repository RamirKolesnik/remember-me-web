import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addMine, parseMine } from '../app/shared/mine.ts'

test('reads only valid frame ids', () => {
  assert.deepEqual(parseMine(null), [])
  assert.deepEqual(parseMine('not json'), [])
  assert.deepEqual(parseMine('{"a":1}'), [])
  assert.deepEqual(parseMine('[3, -1, 2.5, "7", 12]'), [3, 12])
})

test('adds a frame once', () => {
  assert.deepEqual(addMine([3], 12), [3, 12])
  assert.deepEqual(addMine([3, 12], 12), [3, 12])
})

test('keeps the last 200', () => {
  const many = Array.from({ length: 200 }, (_, i) => i + 1)
  const next = addMine(many, 999)
  assert.equal(next.length, 200)
  assert.equal(next[0], 2)
  assert.equal(next.at(-1), 999)
})

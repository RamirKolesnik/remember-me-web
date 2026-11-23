import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newcomers, newestNumber, timeAgo } from '../app/shared/recent.ts'

const now = Date.UTC(2026, 10, 23, 12, 0, 0)

test('time ago reads like a feed', () => {
  assert.equal(timeAgo(now, now), 'just now')
  assert.equal(timeAgo(now - 59_000, now), 'just now')
  assert.equal(timeAgo(now + 5_000, now), 'just now') // a clock slightly ahead
  assert.equal(timeAgo(now - 60_000, now), '1 min ago')
  assert.equal(timeAgo(now - 59 * 60_000, now), '59 min ago')
  assert.equal(timeAgo(now - 3 * 3_600_000, now), '3 h ago')
  assert.equal(timeAgo(now - 2 * 86_400_000, now), '2 d ago')
  assert.equal(timeAgo(Date.UTC(2026, 10, 2), now), 'Nov 2')
  assert.equal(timeAgo(Date.UTC(2025, 11, 30), now), 'Dec 30, 2025')
  assert.equal(timeAgo(null, now), '')
})

test('newcomers are the frames past the newest one seen', () => {
  const frames = [{ id: 9, number: 12 }, { id: 8, number: 11 }, { id: 3, number: 10 }]
  assert.deepEqual(newcomers(null, frames), [])
  assert.deepEqual(newcomers(10, frames), [9, 8])
  assert.deepEqual(newcomers(12, frames), [])
  assert.deepEqual(newcomers(10, [{ id: 1, number: null }]), [])
})

test('newest number only grows', () => {
  assert.equal(newestNumber(null, []), null)
  assert.equal(newestNumber(null, [{ number: 4 }, { number: 9 }, { number: null }]), 9)
  assert.equal(newestNumber(12, [{ number: 9 }]), 12)
})

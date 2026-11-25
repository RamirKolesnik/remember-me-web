import { test } from 'node:test'
import assert from 'node:assert/strict'
import { beatStep, bpm, heartbeatLabel, HEARTBEAT_SCALE, purchasesLastHour } from '../app/shared/heartbeat.ts'

test('with no purchases the heart beats once every 10 seconds', () => {
  assert.equal(beatStep(0).every, 10)
  assert.equal(bpm(0), 6)
})

test('the heart speeds up with purchases per hour', () => {
  assert.deepEqual([0, 1, 4, 5, 19, 20, 59, 60, 199, 200, 599, 600, 5000].map(bpm),
    [6, 10, 10, 15, 15, 24, 24, 40, 40, 60, 60, 80, 80])
  for (let i = 1; i < HEARTBEAT_SCALE.length; i++) {
    assert.ok(HEARTBEAT_SCALE[i]!.from > HEARTBEAT_SCALE[i - 1]!.from)
    assert.ok(HEARTBEAT_SCALE[i]!.every < HEARTBEAT_SCALE[i - 1]!.every)
  }
})

test('only frames from the last hour count', () => {
  const now = Date.UTC(2026, 10, 25, 18, 0, 0)
  const frames = [
    { liveAt: now - 5 * 60_000 },
    { liveAt: now - 59 * 60_000 },
    { liveAt: now - 61 * 60_000 },
    { liveAt: null },
    { liveAt: now + 10_000 }, // a server clock slightly ahead
  ]
  assert.equal(purchasesLastHour(frames, now), 3)
})

test('the label reads well', () => {
  assert.equal(heartbeatLabel(0), '6 bpm · no frames in the last hour')
  assert.equal(heartbeatLabel(1), '10 bpm · 1 frame in the last hour')
  assert.equal(heartbeatLabel(1200), '80 bpm · 1,200 frames in the last hour')
})

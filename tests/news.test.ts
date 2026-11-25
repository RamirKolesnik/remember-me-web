import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextStepText, progressText, unlockText, wallNews, waveName } from '../app/shared/news.ts'
import { NOTHING_SOLD, pricing, zonePrice } from '../app/shared/wall.ts'

test('waves have names people understand', () => {
  assert.equal(waveName({ n: 1 }), 'the center')
  assert.equal(waveName({ n: 2 }), 'the Veins ring')
  assert.equal(waveName({ n: 3 }), 'the edge')
})

test('progress never shows a misleading 0% or over 100%', () => {
  assert.equal(progressText(0, 100), '0%')
  assert.equal(progressText(1, 45_000), '<1%')
  assert.equal(progressText(4_500, 45_000), '10%')
  assert.equal(progressText(50_000, 45_000), '100%')
})

test('price steps read as a countdown', () => {
  const p = pricing(NOTHING_SOLD)
  assert.equal(nextStepText(zonePrice(p, 1)), 'Rises to $39 in 1,972 spots')
  const last = zonePrice(pricing({ ...NOTHING_SOLD, 1: 9_855 }), 1)
  assert.equal(nextStepText(last), 'Last price · 1 spot left')
  assert.equal(nextStepText(zonePrice(pricing({ ...NOTHING_SOLD, 1: 9_856 }), 1)), 'Sold out')
})

test('a closed wave says what opens it', () => {
  const p = pricing({ ...NOTHING_SOLD, 1: 3_000, 2: 6_000 })
  assert.equal(unlockText(p, 2), 'Opens when the center is half sold · 20% there')
  assert.equal(unlockText(p, 3), 'Opens after the Veins ring')
})

test('news at launch: closest price rise first, then founders, then the next wave', () => {
  const news = wallNews(pricing({ ...NOTHING_SOLD, 1: 300 }))
  assert.deepEqual(news.map((n) => n.kind), ['step', 'founders', 'step', 'wave'])
  assert.equal(news[0]!.text, 'Chambers $29 now · rises to $39 in 1,672 spots')
  assert.equal(news[1]!.text, 'Founder badge for the first 1,000 frames · 700 left')
  assert.equal(news[3]!.text, 'Next: the Veins ring opens · when the center is half sold · <1% there')
  // No founder line once they are gone.
  assert.ok(!wallNews(pricing({ ...NOTHING_SOLD, 2: 1_000 })).some((n) => n.kind === 'founders'))
})

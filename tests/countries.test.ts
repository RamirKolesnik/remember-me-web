import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countryName, countryTable, demoCountry, demoStats, DEMO_COUNTRIES } from '../app/shared/countries.ts'

test('countries are named in English', () => {
  assert.equal(countryName('US'), 'United States')
  assert.equal(countryName('UZ'), 'Uzbekistan')
})

test('the table ranks countries and sums up the rest', () => {
  const t = countryTable({
    total: 12, unknown: 2,
    countries: [{ code: 'DE', count: 1 }, { code: 'US', count: 5 }, { code: 'BR', count: 2 }, { code: 'UZ', count: 2 }],
  }, 2)
  assert.equal(t.known, 10)
  assert.equal(t.countryCount, 4)
  assert.deepEqual(t.top.map((r) => [r.code, r.count, r.share]), [['US', 5, 0.5], ['BR', 2, 0.2]])
  assert.deepEqual(t.rest, { countries: 2, count: 3, share: 0.3 })
  assert.equal(t.unknown, 2)
})

test('no rest row when the top holds everything; an empty wall has no shares', () => {
  assert.equal(countryTable({ total: 1, unknown: 0, countries: [{ code: 'US', count: 1 }] }).rest, null)
  const empty = countryTable({ total: 0, unknown: 0, countries: [] })
  assert.equal(empty.known, 0)
  assert.deepEqual(empty.top, [])
})

test('demo frames keep their country and follow the pool', () => {
  assert.equal(demoCountry(42), demoCountry(42))
  const frames = Array.from({ length: 5000 }, (_, i) => ({ id: i + 1 }))
  const s = demoStats(frames)
  assert.equal(s.countries.reduce((n, c) => n + c.count, 0), 5000)
  assert.ok(s.countries.every((c) => DEMO_COUNTRIES.some(([code]) => code === c.code)))
  const top = countryTable(s, 1).top[0]!
  assert.equal(top.code, 'US')
})

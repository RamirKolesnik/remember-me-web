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

import { ALL_COUNTRIES, countryFromLocale, countryPlace, ordinal, searchCountries } from '../app/shared/countries.ts'

test('every country code is listed once and has a name', () => {
  assert.equal(new Set(ALL_COUNTRIES).size, ALL_COUNTRIES.length)
  assert.ok(ALL_COUNTRIES.length >= 249)
  for (const c of ALL_COUNTRIES) assert.match(c, /^[A-Z]{2}$/)
  for (const c of ['US', 'UZ', 'KZ', 'DE']) assert.notEqual(countryName(c), c)
})

test('the country search finds names, codes, aliases and ignores accents', () => {
  assert.equal(searchCountries('uzb')[0], 'UZ')
  assert.equal(searchCountries('Uz')[0], 'UZ')
  assert.equal(searchCountries('usa')[0], 'US')
  assert.equal(searchCountries('uk')[0], 'GB')
  assert.equal(searchCountries('germ')[0], 'DE')
  assert.ok(searchCountries('kingdom').includes('GB'))
  assert.ok(searchCountries('cote').includes('CI'))
  assert.deepEqual(searchCountries('  '), [])
  assert.deepEqual(searchCountries('qqqq'), [])
  assert.ok(searchCountries('a', 6).length <= 6)
})

test('a country knows its place on the wall', () => {
  const stats = { total: 10, unknown: 0, countries: [{ code: 'US', count: 5 }, { code: 'DE', count: 2 }, { code: 'BR', count: 2 }, { code: 'UZ', count: 1 }] }
  assert.deepEqual(countryPlace(stats, 'US'), { code: 'US', name: 'United States', rank: 1, count: 5, share: 0.5, of: 4 })
  assert.equal(countryPlace(stats, 'BR').rank, 2) // tied with DE
  assert.equal(countryPlace(stats, 'UZ').rank, 4)
  const none = countryPlace(stats, 'IS')
  assert.equal(none.rank, null)
  assert.equal(none.count, 0)
})

test('ordinals and locales', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal),
    ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '111th'])
  assert.equal(countryFromLocale('en-US'), 'US')
  assert.equal(countryFromLocale('uz-Latn-UZ'), 'UZ')
  assert.equal(countryFromLocale('ru'), null)
  assert.equal(countryFromLocale(undefined), null)
})

// Where buyers come from. A country is an ISO 3166-1 alpha-2 code ("US").
// The API counts live frames per country (GET /wall/countries); the demo wall
// gives each demo frame a country from a weighted pool instead.

export interface CountryCount { code: string; count: number }
export interface CountryStats { total: number; unknown: number; countries: CountryCount[] }

export interface CountryRow {
  code: string
  name: string
  count: number
  /** Share of frames whose country is known, 0..1. */
  share: number
}

export interface CountryTable {
  /** Frames whose country is known: the base of every share. */
  known: number
  /** How many different countries. */
  countryCount: number
  top: CountryRow[]
  /** Everything after the top, summed; null when nothing is left over. */
  rest: { countries: number; count: number; share: number } | null
  unknown: number
}

let names: Intl.DisplayNames | null | undefined
/** "United States" for "US"; the code itself if the browser cannot name it. */
export function countryName(code: string): string {
  if (names === undefined) {
    try { names = new Intl.DisplayNames(['en'], { type: 'region' }) } catch { names = null }
  }
  try { return names?.of(code) ?? code } catch { return code }
}

/** The top `limit` countries with their shares, and the rest summed up. */
export function countryTable(stats: CountryStats, limit = 5): CountryTable {
  const list = [...stats.countries]
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
  const known = list.reduce((s, c) => s + c.count, 0)
  const share = (n: number) => (known > 0 ? n / known : 0)
  const top = list.slice(0, limit).map((c) => ({ code: c.code, name: countryName(c.code), count: c.count, share: share(c.count) }))
  const after = list.slice(limit)
  const restCount = after.reduce((s, c) => s + c.count, 0)
  return {
    known,
    countryCount: list.length,
    top,
    rest: after.length ? { countries: after.length, count: restCount, share: share(restCount) } : null,
    unknown: stats.unknown,
  }
}

/** A plausible global audience, for the demo wall only. */
export const DEMO_COUNTRIES: readonly (readonly [string, number])[] = [
  ['US', 22], ['IN', 9], ['BR', 7], ['GB', 6], ['DE', 5], ['ID', 4], ['MX', 4], ['FR', 4],
  ['TR', 3], ['PH', 3], ['UZ', 3], ['CA', 3], ['JP', 3], ['KR', 2], ['ES', 2], ['IT', 2],
  ['PL', 2], ['NG', 2], ['AR', 2], ['AU', 2], ['KZ', 2], ['UA', 2], ['VN', 1], ['EG', 1],
  ['NL', 1], ['SE', 1], ['TH', 1], ['PK', 1], ['CO', 1], ['ZA', 1], ['SA', 1], ['AE', 1],
]
const DEMO_WEIGHT = DEMO_COUNTRIES.reduce((s, [, w]) => s + w, 0)

/** The same country for the same demo frame, every time. */
export function demoCountry(id: number): string {
  // A cheap integer hash spreads neighbouring ids over the pool.
  let h = Math.imul(id ^ 0x9e3779b9, 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  let v = ((h ^ (h >>> 16)) >>> 0) % DEMO_WEIGHT
  for (const [code, w] of DEMO_COUNTRIES) {
    if (v < w) return code
    v -= w
  }
  return DEMO_COUNTRIES[0]![0]
}

/** Country stats of the demo wall. */
export function demoStats(frames: readonly { id: number }[]): CountryStats {
  const by = new Map<string, number>()
  for (const f of frames) {
    const c = demoCountry(f.id)
    by.set(c, (by.get(c) ?? 0) + 1)
  }
  return { total: frames.length, unknown: 0, countries: [...by].map(([code, count]) => ({ code, count })) }
}

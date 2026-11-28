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

/** Every ISO 3166-1 alpha-2 country, for the country search. */
export const ALL_COUNTRIES: readonly string[] = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT ' +
  'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG ' +
  'UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'
).split(' ')

/** Other names people type: "USA", "UK", "Russia", "Korea", "Holland"... */
const ALIASES: Record<string, string> = {
  usa: 'US', america: 'US', 'united states of america': 'US', uk: 'GB', england: 'GB', britain: 'GB',
  'great britain': 'GB', scotland: 'GB', wales: 'GB', holland: 'NL', russia: 'RU', korea: 'KR',
  'south korea': 'KR', 'north korea': 'KP', uae: 'AE', emirates: 'AE', 'czech republic': 'CZ', czechia: 'CZ',
  turkey: 'TR', turkiye: 'TR', 'ivory coast': 'CI', burma: 'MM', persia: 'IR', vatican: 'VA',
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * Countries for what was typed, best first: an exact code or alias, then
 * names that start with it, then names with a word that starts with it.
 */
export function searchCountries(query: string, limit = 6): string[] {
  const q = fold(query).replace(/\s+/g, ' ')
  if (!q) return []
  const scored: [string, number, string][] = []
  const alias = ALIASES[q]
  for (const code of ALL_COUNTRIES) {
    const name = fold(countryName(code))
    let score = -1
    if (code === alias || (q.length === 2 && code.toLowerCase() === q)) score = 0
    else if (name === q) score = 0
    else if (name.startsWith(q)) score = 1
    else if (name.split(/[\s,()-]+/).some((w) => w.startsWith(q))) score = 2
    else if (Object.entries(ALIASES).some(([a, c]) => c === code && a.startsWith(q))) score = 3
    if (score >= 0) scored.push([code, score, name])
  }
  return scored.sort((a, b) => a[1] - b[1] || a[2].localeCompare(b[2])).slice(0, limit).map(([c]) => c)
}

export interface CountryPlace {
  code: string
  name: string
  /** 1 for the country with the most frames; null when it has none yet. */
  rank: number | null
  count: number
  share: number
  /** How many countries are on the wall. */
  of: number
}

/** Where a country stands: its rank (ties share the better rank), frames and share. */
export function countryPlace(stats: CountryStats, code: string): CountryPlace {
  const list = stats.countries.filter((c) => c.count > 0)
  const known = list.reduce((s, c) => s + c.count, 0)
  const count = list.find((c) => c.code === code)?.count ?? 0
  const rank = count > 0 ? list.filter((c) => c.count > count).length + 1 : null
  return { code, name: countryName(code), rank, count, share: known > 0 ? count / known : 0, of: list.length }
}

/** "1st", "2nd", "3rd", "11th", "22nd". */
export function ordinal(n: number): string {
  const t = n % 100
  if (t >= 11 && t <= 13) return `${n}th`
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
}

/** A country code from a browser language like "en-US" or "uz-Latn-UZ"; null without a region. */
export function countryFromLocale(locale: string | undefined): string | null {
  if (!locale) return null
  try {
    const region = new Intl.Locale(locale).region
    return region && ALL_COUNTRIES.includes(region) ? region : null
  } catch {
    return null
  }
}

// What is about to change on the wall, in words: price rises, the next wave
// opening, founder spots running out. Shown in the price strip, the stats
// panel and the purchase pages.
import { FOUNDERS, formatUsd, WAVE_UNLOCK_SHARE, ZONES, type Pricing, type Wave, type ZoneId, type ZonePrice } from './wall.ts'
import { tierOf } from './tiers.ts'

const fmt = (n: number) => n.toLocaleString('en-US')
const spots = (n: number) => `${fmt(n)} ${n === 1 ? 'spot' : 'spots'}`

/** "the center", "the Veins ring", "the edge". */
export function waveName(w: Pick<Wave, 'n'>): string {
  if (w.n === 1) return 'the center'
  if (w.n === 3) return 'the edge'
  return `the ${ZONES.filter((z) => z.wave === w.n).map((z) => tierOf(z.id).name).join(' + ')} ring`
}

/** Share of the way to unlocking, as a whole percent; "<1%" for a start. */
export function progressText(done: number, goal: number): string {
  if (done <= 0) return '0%'
  const pct = Math.floor((done / goal) * 100)
  return pct < 1 ? '<1%' : `${Math.min(pct, 100)}%`
}

/** "Rises to $39 in 1,997 spots" or "Last price · 312 spots left". */
export function nextStepText(z: ZonePrice): string {
  if (z.nextPriceCents === null) return z.leftAtPrice > 0 ? `Last price · ${spots(z.leftAtPrice)} left` : 'Sold out'
  return `Rises to ${formatUsd(z.nextPriceCents)} in ${spots(z.leftAtPrice)}`
}

/** For a closed wave: "Opens when the center is half sold · 12% there". */
export function unlockText(p: Pricing, waveN: number): string {
  const before = p.waves[waveN - 2]
  if (!before) return ''
  const share = WAVE_UNLOCK_SHARE === 0.5 ? 'half' : `${Math.round(WAVE_UNLOCK_SHARE * 100)}%`
  if (!before.open) return `Opens after ${waveName(before)}`
  return `Opens when ${waveName(before)} is ${share} sold · ${progressText(before.sold, before.unlockAt)} there`
}

export interface News {
  kind: 'step' | 'wave' | 'founders'
  /** Zone colour for the dot; null for news about the whole wall. */
  zoneId: ZoneId | null
  text: string
}

/** Everything worth announcing, most pressing first. */
export function wallNews(p: Pricing): News[] {
  const steps = p.zones
    .filter((z) => z.open && z.leftAtPrice > 0)
    .sort((a, b) => a.leftAtPrice / a.zone.capacity - b.leftAtPrice / b.zone.capacity)
    .map((z): News => ({
      kind: 'step',
      zoneId: z.zone.id,
      text: `${tierOf(z.zone.id).name} ${formatUsd(z.priceCents)} now · ${nextStepText(z).replace(/^R/, 'r')}`,
    }))
  const news: News[] = [...steps]
  if (p.foundersLeft > 0) {
    news.splice(1, 0, {
      kind: 'founders',
      zoneId: null,
      text: `Founder badge for the first ${fmt(FOUNDERS)} frames · ${fmt(p.foundersLeft)} left`,
    })
  }
  const next = p.waves.find((w) => !w.open)
  if (next) {
    news.push({ kind: 'wave', zoneId: next.zones[0]!, text: `Next: ${waveName(next)} opens · ${unlockText(p, next.n).replace(/^Opens /, '')}` })
  }
  return news
}

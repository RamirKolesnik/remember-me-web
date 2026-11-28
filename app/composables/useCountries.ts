import { countryFromLocale, demoStats, type CountryStats } from '~/shared/countries'

const POLL_MS = 60_000

// One poller per browser tab. Countries change slowly: once a minute is plenty.
const state = {
  stats: shallowRef<CountryStats | null>(null),
  /** The visitor's own country: from the API (by IP), else the browser language. */
  mine: shallowRef<string | null>(null),
  started: false,
  mineAsked: false,
  busy: false,
}

/**
 * Frames per country. Live: GET /wall/countries, refreshed every minute while
 * the tab is visible. Demo: worked out from the demo wall. Null until known.
 */
export function useCountries() {
  const api = useApi()
  const { frames } = useWall()

  async function refresh() {
    if (!api.live || state.busy) return
    state.busy = true
    try {
      state.stats.value = await api.get<CountryStats>('/wall/countries')
    } catch {
      // Keep what we had; the next poll tries again.
    } finally {
      state.busy = false
    }
  }

  if (import.meta.client && api.live && !state.started) {
    state.started = true
    refresh()
    setInterval(() => { if (document.visibilityState === 'visible') refresh() }, POLL_MS)
  }

  async function findMine() {
    if (state.mineAsked) return
    state.mineAsked = true
    const guess = countryFromLocale(navigator.languages?.find((l) => countryFromLocale(l)) ?? navigator.language)
    state.mine.value = guess
    if (!api.live) return
    try {
      const res = await api.get<{ country: string | null }>('/me/country')
      if (res.country) state.mine.value = res.country
    } catch {
      // The browser's guess stays.
    }
  }
  if (import.meta.client) findMine()

  const stats = computed<CountryStats | null>(() => (api.live ? state.stats.value : demoStats(frames.value)))
  return { stats, mine: state.mine, refresh }
}

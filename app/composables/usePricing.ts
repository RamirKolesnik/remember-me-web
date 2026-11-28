import { milestonesOf, NOTHING_SOLD, pricing, zoneOfCell, type Milestones, type Pricing, type Sold, type ZoneId } from '~/shared/wall'
import type { WallFrame } from '~/composables/useWall'

const POLL_MS = 15_000

// One poller per browser tab, shared by every component that shows prices.
const state = {
  sold: shallowRef<Sold | null>(null),
  milestones: shallowRef<Milestones | null>(null),
  started: false,
  busy: false,
}

/** Frames per zone on the demo wall (no API). */
function soldOnWall(frames: readonly WallFrame[]): Sold {
  const sold: Record<ZoneId, number> = { ...NOTHING_SOLD }
  for (const f of frames) {
    if (f.size !== 1) continue // the heart is not in any zone's count
    sold[zoneOfCell(f.x, f.y).id]++
  }
  return sold
}

/**
 * Current prices and waves. Live: from GET /wall/pricing, refreshed every
 * 15 s while the tab is visible. Demo: worked out from the demo wall.
 * `pricing` is null until the first answer arrives.
 */
export function usePricing() {
  const api = useApi()
  const { frames } = useWall()

  async function refresh() {
    if (!api.live || state.busy) return
    state.busy = true
    try {
      const res = await api.get<{ sold: Record<string, number>; milestones?: Milestones }>('/wall/pricing')
      state.sold.value = {
        1: Number(res.sold['1'] ?? 0), 2: Number(res.sold['2'] ?? 0),
        3: Number(res.sold['3'] ?? 0), 4: Number(res.sold['4'] ?? 0),
      }
      // An API from before the tags has no milestones: only the frame's own tags then.
      if (res.milestones) state.milestones.value = res.milestones
    } catch {
      // Keep the last known prices; the next poll tries again.
    } finally {
      state.busy = false
    }
  }

  if (import.meta.client && api.live && !state.started) {
    state.started = true
    refresh()
    setInterval(() => { if (document.visibilityState === 'visible') refresh() }, POLL_MS)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh() })
  }

  const current = computed<Pricing | null>(() => {
    if (!api.live) return pricing(soldOnWall(frames.value))
    return state.sold.value ? pricing(state.sold.value) : null
  })
  /** Zone ids not on sale yet. */
  const closedZones = computed<ZoneId[]>(() => current.value?.zones.filter((z) => !z.open).map((z) => z.zone.id) ?? [])

  /** First wave, first frame and last spot of each zone: for the tags (tagsOf). Null until known. */
  const milestones = computed<Milestones | null>(() =>
    api.live ? state.milestones.value : milestonesOf(frames.value))

  return { pricing: current, closedZones, milestones, refresh }
}

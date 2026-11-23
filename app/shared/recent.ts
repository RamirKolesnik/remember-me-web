// The "Just immortalized" feed: how long ago a frame went live, and which
// frames in a fresh answer are new since the last one.

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** "just now", "5 min ago", "3 h ago", "2 d ago", then the date ("Nov 2"). */
export function timeAgo(at: number | null, now: number): string {
  if (at === null || !Number.isFinite(at)) return ''
  const d = Math.max(0, now - at)
  if (d < MIN) return 'just now'
  if (d < HOUR) return `${Math.floor(d / MIN)} min ago`
  if (d < DAY) return `${Math.floor(d / HOUR)} h ago`
  if (d < 7 * DAY) return `${Math.floor(d / DAY)} d ago`
  const date = new Date(at)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }
  if (date.getUTCFullYear() !== new Date(now).getUTCFullYear()) opts.year = 'numeric'
  return date.toLocaleDateString('en-US', opts)
}

/**
 * Ids of frames that went live after the newest one already seen. The first
 * answer (seen = null) has no newcomers: those frames were there before.
 */
export function newcomers(seen: number | null, frames: readonly { id: number; number: number | null }[]): number[] {
  if (seen === null) return []
  return frames.filter((f) => f.number !== null && f.number > seen).map((f) => f.id)
}

/** Highest frame number in a list, or the previous one if the list has none higher. */
export function newestNumber(prev: number | null, frames: readonly { number: number | null }[]): number | null {
  let top = prev
  for (const f of frames) if (f.number !== null && (top === null || f.number > top)) top = f.number
  return top
}

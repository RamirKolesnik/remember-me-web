// How fast the heart of the wall beats: the more frames went live in the last
// hour, the faster. With no purchases it still beats, once every 10 seconds.

export interface BeatStep {
  /** Purchases in the last hour from which this step applies. */
  from: number
  /** Seconds between beats. */
  every: number
}

export const HEARTBEAT_SCALE: readonly BeatStep[] = [
  { from: 0, every: 10 },   //  6 bpm: resting
  { from: 1, every: 6 },    // 10 bpm
  { from: 5, every: 4 },    // 15 bpm
  { from: 20, every: 2.5 }, // 24 bpm
  { from: 60, every: 1.5 }, // 40 bpm
  { from: 200, every: 1 },  // 60 bpm
  { from: 600, every: 0.75 }, // 80 bpm: the wall is racing
]

export function beatStep(perHour: number): BeatStep {
  let step = HEARTBEAT_SCALE[0]!
  for (const s of HEARTBEAT_SCALE) if (perHour >= s.from) step = s
  return step
}

/** Beats per minute for this many purchases in the last hour. */
export const bpm = (perHour: number) => Math.round(60 / beatStep(perHour).every)

const HOUR = 3_600_000

/** Frames that went live in the hour before `now` (ms). Demo frames have no time and do not count. */
export function purchasesLastHour(frames: readonly { liveAt: number | null }[], now: number): number {
  let n = 0
  for (const f of frames) if (f.liveAt !== null && f.liveAt > now - HOUR && f.liveAt <= now + 60_000) n++
  return n
}

/** "6 bpm · no frames in the last hour", "15 bpm · 7 frames in the last hour". */
export function heartbeatLabel(perHour: number): string {
  const what = perHour === 0 ? 'no frames' : perHour === 1 ? '1 frame' : `${perHour.toLocaleString('en-US')} frames`
  return `${bpm(perHour)} bpm · ${what} in the last hour`
}

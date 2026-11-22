import { HEART, WALL_SIZE, type FrameSize } from '~/shared/wall'

export interface WallFrame {
  id: number
  x: number
  y: number
  size: FrameSize
  name: string
  note: string
  color: string
  ink: string
  initials: string
  placedAt: string
}

/** Swatches standing in for photos until real avatars come from the API. */
const PALETTE: readonly [string, string][] = [
  ['#C9C3F0', '#3C3489'], ['#F4C0D1', '#72243E'], ['#9FE1CB', '#085041'],
  ['#FAC775', '#633806'], ['#B5D4F4', '#0C447C'], ['#F5C4B3', '#712B13'],
  ['#C0DD97', '#27500A'], ['#D3D1C7', '#444441'],
]

const FIRST = ['Aziza', 'Timur', 'Lena', 'Diego', 'Mei', 'Omar', 'Sofia', 'Ravi', 'Nodira', 'Jonas', 'Aiko', 'Malik', 'Elif', 'Kofi', 'Ana', 'Yusuf', 'Ingrid', 'Bekzod', 'Chloe', 'Arjun']
const LAST = ['K.', 'R.', 'M.', 'S.', 'T.', 'B.', 'A.', 'L.', 'N.', 'H.']
const NOTES = [
  'Was here before it was cool.',
  'Hi mom!',
  'Say hi on insta — @{h}',
  'To whoever finds this: be kind today.',
  'First frame I ever bought. Not the last.',
  'Remember us — {n} & friends, Tashkent.',
  'Find me on X: @{h}',
  'Ship it.',
  'Forever is a long time. Good.',
  'Painter, runner, dad. @{h}',
]

/** Deterministic demo wall used until the API is live. */
function buildDemoFrames(): WallFrame[] {
  let seed = 20261122
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
  const taken = new Uint8Array(WALL_SIZE * WALL_SIZE)
  taken[HEART.y * WALL_SIZE + HEART.x] = 1 // the heart stays unsold in the demo
  const fits = (x: number, y: number, n: number) => {
    if (x < 0 || y < 0 || x + n > WALL_SIZE || y + n > WALL_SIZE) return false
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (taken[(y + j) * WALL_SIZE + x + i]) return false
    }
    return true
  }
  const frames: WallFrame[] = []
  const add = (x: number, y: number, n: FrameSize) => {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) taken[(y + j) * WALL_SIZE + x + i] = 1
    const [color, ink] = PALETTE[Math.floor(rnd() * PALETTE.length)]!
    const first = FIRST[Math.floor(rnd() * FIRST.length)]!
    const last = LAST[Math.floor(rnd() * LAST.length)]!
    const handle = `${first.toLowerCase()}.${Math.floor(rnd() * 90 + 10)}`
    const note = NOTES[Math.floor(rnd() * NOTES.length)]!.replace('{h}', handle).replace('{n}', first)
    const month = ['Sep', 'Oct', 'Nov'][Math.floor(rnd() * 3)]
    frames.push({
      id: frames.length + 1, x, y, size: n, name: `${first} ${last}`, note, color, ink,
      initials: first[0]! + last[0]!, placedAt: `${month} 2026`,
    })
  }
  const gauss = () => rnd() + rnd() + rnd() - 1.5
  for (let t = 0; t < 12000 && frames.length < 1800; t++) {
    const r = rnd()
    const n: FrameSize = r < 0.6 ? 1 : r < 0.9 ? 2 : 3
    const spread = rnd() < 0.85 ? 34 : 160
    const x = Math.round(HEART.x + gauss() * spread)
    const y = Math.round(HEART.y + gauss() * spread)
    if (fits(x, y, n)) add(x, y, n)
  }
  return frames
}

let cache: { frames: WallFrame[]; occupancy: Int32Array } | null = null

/**
 * Frames on the wall plus an occupancy grid: occupancy[y * 1000 + x] holds the
 * frame's index + 1, or 0 for a free cell.
 */
export function useWall() {
  if (!cache) {
    const frames = buildDemoFrames()
    const occupancy = new Int32Array(WALL_SIZE * WALL_SIZE)
    frames.forEach((f, idx) => {
      for (let i = 0; i < f.size; i++) for (let j = 0; j < f.size; j++) {
        occupancy[(f.y + j) * WALL_SIZE + f.x + i] = idx + 1
      }
    })
    cache = { frames, occupancy }
  }
  const { frames, occupancy } = cache
  const frameAt = (x: number, y: number): WallFrame | null => {
    if (x < 0 || y < 0 || x >= WALL_SIZE || y >= WALL_SIZE) return null
    const idx = occupancy[y * WALL_SIZE + x]!
    return idx ? frames[idx - 1]! : null
  }
  const isFree = (x: number, y: number, size: number) => {
    for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) {
      const cx = x + i, cy = y + j
      if (cx < 0 || cy < 0 || cx >= WALL_SIZE || cy >= WALL_SIZE) return false
      if (occupancy[cy * WALL_SIZE + cx]) return false
    }
    return true
  }
  const cellsTaken = frames.reduce((s, f) => s + f.size * f.size, 0)
  return { frames, frameAt, isFree, cellsTaken, isDemo: true }
}

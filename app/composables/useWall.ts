import { overlapsHeart, WALL_SIZE, type FrameSize } from '~/shared/wall'

export interface WallFrame {
  id: number
  /** Order in which the frame went live: "I'm #4,812 on the wall". */
  number: number | null
  x: number
  y: number
  size: FrameSize
  name: string
  note: string
  color: string
  ink: string
  initials: string
  placedAt: string
  photoUrl: string | null
}

export interface ApiFrame {
  id: number
  number: number | null
  x: number
  y: number
  size: number
  name: string
  note: string
  photoUrl: string | null
  placedAt: string | null
}

/** Swatches shown while a photo loads, or when there is none. */
const PALETTE: readonly [string, string][] = [
  ['#C9C3F0', '#3C3489'], ['#F4C0D1', '#72243E'], ['#9FE1CB', '#085041'],
  ['#FAC775', '#633806'], ['#B5D4F4', '#0C447C'], ['#F5C4B3', '#712B13'],
  ['#C0DD97', '#27500A'], ['#D3D1C7', '#444441'],
]

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?'

const monthOf = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''

export function fromApi(f: ApiFrame): WallFrame {
  const [color, ink] = PALETTE[f.id % PALETTE.length]!
  return {
    id: f.id, number: f.number ?? null, x: f.x, y: f.y, size: f.size as FrameSize, name: f.name, note: f.note,
    color, ink, initials: initialsOf(f.name), placedAt: monthOf(f.placedAt), photoUrl: f.photoUrl,
  }
}

const FIRST = ['Aziza', 'Timur', 'Lena', 'Diego', 'Mei', 'Omar', 'Sofia', 'Ravi', 'Nodira', 'Jonas', 'Aiko', 'Malik', 'Elif', 'Kofi', 'Ana', 'Yusuf', 'Ingrid', 'Bekzod', 'Chloe', 'Arjun']
const LAST = ['K.', 'R.', 'M.', 'S.', 'T.', 'B.', 'A.', 'L.', 'N.', 'H.']
const NOTES = [
  'Was here before it was cool.', 'Hi mom!', 'Say hi on insta — @{h}', 'To whoever finds this: be kind today.',
  'First frame I ever bought. Not the last.', 'Remember us — {n} & friends, Tashkent.', 'Find me on X: @{h}',
  'Ship it.', 'Forever is a long time. Good.', 'Painter, runner, dad. @{h}',
]

/** Deterministic demo wall, used when no API is configured. */
function buildDemoFrames(): WallFrame[] {
  let seed = 20261122
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
  const taken = new Uint8Array(WALL_SIZE * WALL_SIZE)
  const fits = (x: number, y: number, n: number) => {
    if (x < 0 || y < 0 || x + n > WALL_SIZE || y + n > WALL_SIZE || overlapsHeart(x, y, n)) return false
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (taken[(y + j) * WALL_SIZE + x + i]) return false
    return true
  }
  const frames: WallFrame[] = []
  const gauss = () => rnd() + rnd() + rnd() - 1.5
  for (let t = 0; t < 12000 && frames.length < 1800; t++) {
    const r = rnd()
    const n: FrameSize = r < 0.6 ? 1 : r < 0.9 ? 2 : 3
    const spread = rnd() < 0.85 ? 34 : 160
    const x = Math.round(WALL_SIZE / 2 + gauss() * spread)
    const y = Math.round(WALL_SIZE / 2 + gauss() * spread)
    if (!fits(x, y, n)) continue
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) taken[(y + j) * WALL_SIZE + x + i] = 1
    const [color, ink] = PALETTE[Math.floor(rnd() * PALETTE.length)]!
    const first = FIRST[Math.floor(rnd() * FIRST.length)]!
    const last = LAST[Math.floor(rnd() * LAST.length)]!
    const handle = `${first.toLowerCase()}.${Math.floor(rnd() * 90 + 10)}`
    frames.push({
      id: frames.length + 1, number: frames.length + 1, x, y, size: n, name: `${first} ${last}`,
      note: NOTES[Math.floor(rnd() * NOTES.length)]!.replace('{h}', handle).replace('{n}', first),
      color, ink, initials: first[0]! + last[0]!,
      placedAt: `${['Sep', 'Oct', 'Nov'][Math.floor(rnd() * 3)]} 2026`, photoUrl: null,
    })
  }
  return frames
}

// One wall per browser tab, shared by every page.
const state = {
  frames: shallowRef<WallFrame[]>([]),
  status: ref<'idle' | 'loading' | 'ready' | 'error'>('idle'),
  occupancy: null as Int32Array | null,
  /** Cells on hold by other buyers: taken for the spot picker, invisible on the wall. */
  held: null as Uint8Array | null,
}

function index(frames: WallFrame[], holds: { x: number; y: number; size: number }[]) {
  const occ = new Int32Array(WALL_SIZE * WALL_SIZE)
  frames.forEach((f, i) => {
    for (let a = 0; a < f.size; a++) for (let b = 0; b < f.size; b++) occ[(f.y + b) * WALL_SIZE + f.x + a] = i + 1
  })
  const held = new Uint8Array(WALL_SIZE * WALL_SIZE)
  for (const h of holds) {
    for (let a = 0; a < h.size; a++) for (let b = 0; b < h.size; b++) held[(h.y + b) * WALL_SIZE + h.x + a] = 1
  }
  state.occupancy = occ
  state.held = held
  state.frames.value = frames
}

export function useWall() {
  const api = useApi()

  async function load(force = false) {
    if (!import.meta.client) return
    if (state.status.value === 'loading' || (state.status.value === 'ready' && !force)) return
    state.status.value = 'loading'
    try {
      if (!api.live) {
        index(buildDemoFrames(), [])
      } else {
        const windows = [[0, 0, 499, 499], [500, 0, 999, 499], [0, 500, 499, 999], [500, 500, 999, 999]]
        const parts = await Promise.all(windows.map(([x0, y0, x1, y1]) =>
          api.get<{ frames: ApiFrame[] }>(`/wall/frames?x0=${x0}&y0=${y0}&x1=${x1}&y1=${y1}`)))
        const { holds } = await api.get<{ holds: { x: number; y: number; size: number }[] }>('/wall/holds')
        const byId = new Map<number, WallFrame>()
        for (const p of parts) for (const f of p.frames) byId.set(f.id, fromApi(f))
        index([...byId.values()], holds)
      }
      state.status.value = 'ready'
    } catch (err) {
      console.error('Loading the wall failed', err)
      state.status.value = 'error'
    }
  }

  const frameAt = (x: number, y: number): WallFrame | null => {
    if (!state.occupancy || x < 0 || y < 0 || x >= WALL_SIZE || y >= WALL_SIZE) return null
    const i = state.occupancy[y * WALL_SIZE + x]!
    return i ? state.frames.value[i - 1] ?? null : null
  }

  const isFree = (x: number, y: number, size: number) => {
    if (!state.occupancy) return false
    for (let a = 0; a < size; a++) for (let b = 0; b < size; b++) {
      const cx = x + a, cy = y + b
      if (cx < 0 || cy < 0 || cx >= WALL_SIZE || cy >= WALL_SIZE) return false
      const k = cy * WALL_SIZE + cx
      if (state.occupancy[k] || state.held?.[k]) return false
    }
    return true
  }

  const cellsTaken = computed(() => state.frames.value.reduce((s, f) => s + f.size * f.size, 0))
  const byId = (id: number) => state.frames.value.find((f) => f.id === id) ?? null

  return {
    frames: state.frames, status: state.status, load, frameAt, isFree, cellsTaken, byId,
    isDemo: !api.live,
  }
}

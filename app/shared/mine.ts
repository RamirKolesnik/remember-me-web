// Frames this visitor bought, remembered in this browser only (there are no
// accounts), so the wall can mark them "You".

const KEY = 'rm.mine'
const MAX = 200

export function parseMine(raw: string | null): number[] {
  if (!raw) return []
  try {
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v) ? v.filter((n): n is number => Number.isInteger(n) && n > 0).slice(-MAX) : []
  } catch {
    return []
  }
}

export function addMine(list: readonly number[], id: number): number[] {
  return list.includes(id) ? [...list] : [...list, id].slice(-MAX)
}

export function readMine(): number[] {
  try {
    return parseMine(localStorage.getItem(KEY))
  } catch {
    return [] // private mode or no storage
  }
}

export function rememberMine(id: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(addMine(readMine(), id)))
  } catch {
    // private mode: the frame is still bought, just not marked "You" later
  }
}

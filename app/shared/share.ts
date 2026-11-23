// Words and links for sharing a frame. Plain functions, so they can be tested.

/**
 * The public link of a frame, by the number on its story card:
 * https://host/base/f/4812. A frame without a number yet falls back to its id.
 */
export function frameLink(origin: string, baseURL: string, f: { id: number; number: number | null }): string {
  const base = `/${baseURL.replace(/^\/+|\/+$/g, '')}/`.replace(/\/+/g, '/')
  const root = `${origin.replace(/\/+$/, '')}${base}`
  return f.number ? `${root}f/${f.number}` : `${root}?frame=${f.id}`
}

/** "4812", "#4812", "#4,812", " 4 812 " → 4812. Anything else → null. */
export function parseFrameNumber(input: string): number | null {
  const s = input.trim().replace(/^(?:№|#)\s*/, '').replace(/[\s,._']/g, '')
  if (!/^\d{1,7}$/.test(s)) return null
  const n = Number(s)
  return n >= 1 ? n : null
}

/** Text that goes with a shared story card or link. */
export function shareText(f: { number: number | null; isHeart: boolean }): string {
  if (f.isHeart) return 'I own the heart of the wall. Forever.'
  if (f.number) return `I'm #${f.number.toLocaleString('en-US')} on the wall. Forever.`
  return "I'm on the wall. Forever."
}

export const storyFileName = (id: number) => `remember-me-${id}.jpg`

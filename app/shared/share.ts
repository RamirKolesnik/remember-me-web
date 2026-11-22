// Words and links for sharing a frame. Plain functions, so they can be tested.

/** The public link of a frame: https://host/base/f/123 */
export function frameLink(origin: string, baseURL: string, id: number): string {
  const base = `/${baseURL.replace(/^\/+|\/+$/g, '')}/`.replace(/\/+/g, '/')
  return `${origin.replace(/\/+$/, '')}${base}f/${id}`
}

/** Text that goes with a shared story card or link. */
export function shareText(f: { number: number | null; isHeart: boolean }): string {
  if (f.isHeart) return 'I own the heart of the wall. Forever.'
  if (f.number) return `I'm #${f.number.toLocaleString('en-US')} on the wall. Forever.`
  return "I'm on the wall. Forever."
}

export const storyFileName = (id: number) => `remember-me-${id}.jpg`

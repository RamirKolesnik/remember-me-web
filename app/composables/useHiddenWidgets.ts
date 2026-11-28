// Widgets the visitor slid off the screen (desktop), by widget id.
// Remembered in the browser: localStorage `rm.widget.<id>.hidden` = '1'.
export function useHiddenWidgets() {
  return useState<Record<string, boolean>>('wall-widgets-hidden', () => ({}))
}

const key = (id: string) => `rm.widget.${id}.hidden`

export function readHidden(id: string): boolean {
  try { return localStorage.getItem(key(id)) === '1' } catch { return false }
}

export function writeHidden(id: string, hidden: boolean) {
  try { localStorage.setItem(key(id), hidden ? '1' : '0') } catch { /* private mode */ }
}

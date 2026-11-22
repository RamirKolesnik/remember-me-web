export class ApiError extends Error {
  status: number
  body: Record<string, unknown>
  constructor(status: number, body: Record<string, unknown>) {
    super(String(body.error ?? `HTTP ${status}`))
    this.status = status
    this.body = body
  }
}

/**
 * Talks to remember-me-api. With no NUXT_PUBLIC_API_BASE the site runs on
 * demo data and `live` is false.
 */
export function useApi() {
  const base = String(useRuntimeConfig().public.apiBase || '').replace(/\/+$/, '')
  const live = base !== ''

  async function request<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
    const ctrl = new AbortController()
    // A sleeping free-tier server can take about a minute to wake up.
    const timer = setTimeout(() => ctrl.abort(), init?.timeoutMs ?? 90_000)
    try {
      const res = await fetch(`${base}${path}`, {
        ...init,
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
      })
      const text = await res.text()
      const body = text ? JSON.parse(text) : {}
      if (!res.ok) throw new ApiError(res.status, body)
      return body as T
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    live,
    base,
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  }
}

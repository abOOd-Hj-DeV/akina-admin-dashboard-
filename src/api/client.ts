/** عميل HTTP موحّد للباك اند — Bearer token + Idempotency-Key + أخطاء مُنمّطة */

export const API_URL: string = import.meta.env.VITE_API_URL ?? ''
export const API_MOCK: boolean = !API_URL || import.meta.env.VITE_API_MOCK === 'true'

const TOKEN_KEY = 'sakina-token'
const REFRESH_KEY = 'sakina-refresh'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string, refresh?: string) => {
    localStorage.setItem(TOKEN_KEY, t)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY) },
}

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>
  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export interface Page<T> {
  data: T[]
  pagination?: { current_page: number; last_page: number; total: number }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: { idempotency?: boolean; form?: FormData } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (opts.idempotency) headers['Idempotency-Key'] = crypto.randomUUID()
  let payload: BodyInit | undefined
  if (opts.form) payload = opts.form
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`${API_URL}${path}`, { method, headers, body: payload })
  const json = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      tokenStore.clear()
      window.dispatchEvent(new Event('sakina:unauthenticated'))
    }
    const msg = (json as { message?: string } | null)?.message ?? `HTTP ${res.status}`
    const errors = (json as { errors?: Record<string, string[]> } | null)?.errors
    throw new ApiError(res.status, msg, errors)
  }
  return json as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown, idempotent = true) =>
    request<T>('POST', path, body, { idempotency: idempotent }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
}

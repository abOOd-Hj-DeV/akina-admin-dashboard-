/** عميل HTTP موحّد للباك اند — Bearer token + Idempotency-Key + أخطاء مُنمّطة */

export const API_URL: string = import.meta.env.VITE_API_URL ?? ''
// VITE_API_URL فارغ مع VITE_API_MOCK=false = باك اند حقيقي على نفس الأصل (عبر بروكسي /api)
export const API_MOCK: boolean =
  import.meta.env.VITE_API_MOCK === 'true' || (!API_URL && import.meta.env.VITE_API_MOCK !== 'false')

/** خادم Render المجاني يحتاج ~35 ث للإقلاع البارد */
export const REQUEST_TIMEOUT_MS = 60_000

const REFRESH_KEY = 'sakina-refresh'
/** مفاتيح localStorage القديمة — تُحذف عند التحميل ولا تُقرأ */
export const LEGACY_TOKEN_KEYS = ['sakina-token', 'sakina-refresh'] as const

const session = (): Storage | null => (typeof sessionStorage === 'undefined' ? null : sessionStorage)

// توكن الوصول في الذاكرة فقط؛ توكن التجديد في sessionStorage (يُمسح بإغلاق التبويب)
let accessToken: string | null = null
let sessionGeneration = 0

function setTokens(token: string, refresh?: string): void {
  accessToken = token
  if (refresh) session()?.setItem(REFRESH_KEY, refresh)
  else session()?.removeItem(REFRESH_KEY)
}

export const tokenStore = {
  generation: () => sessionGeneration,
  get: () => accessToken,
  getRefresh: () => session()?.getItem(REFRESH_KEY) ?? null,
  set: (t: string, refresh?: string) => {
    sessionGeneration++
    setTokens(t, refresh)
  },
  clear: () => {
    sessionGeneration++
    accessToken = null
    session()?.removeItem(REFRESH_KEY)
  },
}

export function purgeLegacyTokens(): void {
  if (typeof localStorage === 'undefined') return
  for (const k of LEGACY_TOKEN_KEYS) {
    try { localStorage.removeItem(k) } catch { /* تخزين غير متاح */ }
  }
}

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>
  code?: string
  meta?: Record<string, unknown>
  constructor(status: number, message: string, errors?: Record<string, string[]>, code?: string, meta?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.errors = errors
    this.code = code
    this.meta = meta
  }
}

export function assertSession(generation: number): void {
  if (generation !== sessionGeneration) {
    throw new ApiError(0, 'تغيّرت جلسة تسجيل الدخول.', undefined, 'session_changed')
  }
}

export function expireSession(generation: number): void {
  if (generation !== sessionGeneration) return
  tokenStore.clear()
  window.dispatchEvent(new Event('sakina:unauthenticated'))
}

export interface Page<T> {
  data: T[]
  pagination?: { current_page: number; last_page: number; total: number }
}

/** شكل paginate() الخام في لارافيل (تستخدمه مسارات الدعم) */
export interface LaravelPaginator<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

interface TokenPair { access_token: string; refresh_token: string }

/** يرسل الطلب ويقرأ الجسم ضمن نفس المهلة (رؤوس سريعة + جسم متوقف = timeout) */
async function send(method: string, path: string, headers: Record<string, string>, body?: BodyInit, binary = false): Promise<{ res: Response; json: unknown }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS)
  const timeout = () => new ApiError(0, 'انتهت مهلة الاتصال بالخادم. حاول مرة أخرى.', undefined, 'timeout')
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method, headers, body, signal: ctrl.signal,
      ...(binary ? { redirect: 'error' as const, cache: 'no-store' as const } : {}),
    })
    const json = binary && res.ok ? await res.blob() : res.status === 204 ? null : await res.json().catch(() => null)
    if (ctrl.signal.aborted) throw timeout()
    return { res, json }
  } catch (e) {
    if (e instanceof ApiError) throw e
    if (ctrl.signal.aborted) throw timeout()
    throw new ApiError(0, 'تعذّر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى.', undefined, 'network', { cause: String(e) })
  } finally {
    clearTimeout(timer)
  }
}

async function toError(res: Response, json: unknown): Promise<ApiError> {
  const j = (json ?? {}) as { message?: string; errors?: Record<string, string[]>; code?: string; meta?: Record<string, unknown> }
  return new ApiError(res.status, j.message ?? `HTTP ${res.status}`, j.errors, j.code, j.meta)
}

let refreshing: { generation: number; result: Promise<boolean> } | undefined

/**
 * يستبدل زوج التوكنات عبر /auth/refresh. طلب واحد فقط في نفس الوقت: توكن التجديد
 * يُستعمل مرة واحدة، وإعادة استخدامه تُعتبر تسريباً فيُلغي الباك اند كل الجلسات.
 */
export function refreshSession(generation = sessionGeneration): Promise<boolean> {
  if (generation !== sessionGeneration) return Promise.resolve(false)
  if (refreshing?.generation === generation) return refreshing.result
  const refresh_token = tokenStore.getRefresh()
  if (!refresh_token) return Promise.resolve(false)
  const result = (async () => {
    try {
      const { res, json: body } = await send('POST', '/api/v1/auth/refresh',
        { Accept: 'application/json', 'Content-Type': 'application/json' }, JSON.stringify({ refresh_token }))
      const json = body as TokenPair | null
      if (generation !== sessionGeneration) return false
      if (!res.ok || !json?.access_token) { expireSession(generation); return false }
      setTokens(json.access_token, json.refresh_token)
      return true
    } catch {
      return false
    } finally {
      if (refreshing?.generation === generation) refreshing = undefined
    }
  })()
  refreshing = { generation, result }
  return result
}

const NO_RETRY = /^\/api\/v1\/auth\/(login|refresh|forgot-password|reset-password|activate|otp)/

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: { idempotency?: boolean; form?: FormData; binary?: boolean } = {},
  retried = false,
  generation = sessionGeneration,
): Promise<T> {
  assertSession(generation)
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
  const { res, json } = await send(method, path, headers, payload, opts.binary).catch((error) => {
    assertSession(generation)
    throw error
  })
  assertSession(generation)
  if (!res.ok) {
    if (res.status === 401 && !NO_RETRY.test(path)) {
      if (!retried && tokenStore.getRefresh()) {
        if (token !== tokenStore.get() || await refreshSession(generation)) {
          return request<T>(method, path, body, opts, true, generation)
        }
        if (generation !== sessionGeneration && tokenStore.get()) assertSession(generation)
      }
      expireSession(generation)
    }
    throw await toError(res, json)
  }
  return json as T
}

export async function revokeCurrentSession(): Promise<void> {
  const token = tokenStore.get()
  tokenStore.clear()
  if (!token) return
  const { res, json } = await send('POST', '/api/v1/auth/logout', { Accept: 'application/json', Authorization: `Bearer ${token}` })
  if (!res.ok) throw await toError(res, json)
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  getBlob: (path: string) => request<Blob>('GET', path, undefined, { binary: true }),
  post: <T>(path: string, body?: unknown, idempotent = true) =>
    request<T>('POST', path, body, { idempotency: idempotent }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
}

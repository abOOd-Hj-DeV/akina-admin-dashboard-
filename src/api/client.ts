/** عميل HTTP موحّد للباك اند — Bearer token + Idempotency-Key + أخطاء مُنمّطة */

export const API_URL: string = import.meta.env.VITE_API_URL ?? ''
// VITE_API_URL فارغ مع VITE_API_MOCK=false = باك اند حقيقي على نفس الأصل (عبر بروكسي /api)
export const API_MOCK: boolean =
  import.meta.env.VITE_API_MOCK === 'true' || (!API_URL && import.meta.env.VITE_API_MOCK !== 'false')

/** خادم Render المجاني يحتاج ~35 ث للإقلاع البارد */
export const REQUEST_TIMEOUT_MS = 60_000

const REFRESH_KEY = 'sakina-refresh'
const REFRESH_PENDING_KEY = 'sakina-refresh-pending'
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
  session()?.removeItem(REFRESH_PENDING_KEY)
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
    session()?.removeItem(REFRESH_PENDING_KEY)
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

export class MutationOutcomeUnknown extends ApiError {
  readonly retry: () => Promise<unknown>
  constructor(status: number, retry: () => Promise<unknown>) {
    super(status, 'لم يتأكد تنفيذ العملية. تحقق من الحالة قبل إرسال طلب جديد.', undefined, 'mutation_outcome_unknown')
    this.retry = retry
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

export type Recovery = 'retry' | 'sign_in'
type RefreshResult = 'refreshed' | 'invalid' | 'stale' | Recovery
type Rotation = TokenPair | 'invalid' | Recovery
let refreshing: { generation: number; result: Promise<RefreshResult>; rotation: Promise<Rotation> } | undefined

async function rotateRefreshToken(refresh_token: string): Promise<Rotation> {
  try {
    const { res, json: body } = await send('POST', '/api/v1/auth/refresh',
      { Accept: 'application/json', 'Content-Type': 'application/json' }, JSON.stringify({ refresh_token }))
    const json = body as TokenPair | null
    const error = body as { errors?: { refresh_token?: unknown } } | null
    if ([401, 403].includes(res.status) || (res.status === 422 && error?.errors?.refresh_token)) return 'invalid'
    if (res.status === 429 && res.headers.has('Retry-After')) return 'retry'
    if (!res.ok || !json?.access_token || !json.refresh_token) return 'sign_in'
    return json
  } catch {
    return 'sign_in'
  }
}

/**
 * يستبدل زوج التوكنات عبر /auth/refresh. طلب واحد فقط في نفس الوقت: توكن التجديد
 * يُستعمل مرة واحدة، وإعادة استخدامه تُعتبر تسريباً فيُلغي الباك اند كل الجلسات.
 */
export function refreshSession(generation = sessionGeneration): Promise<RefreshResult> {
  if (generation !== sessionGeneration) return Promise.resolve('stale')
  if (refreshing?.generation === generation) return refreshing.result
  const refresh_token = tokenStore.getRefresh()
  if (!refresh_token) return Promise.resolve('invalid')
  if (session()?.getItem(REFRESH_PENDING_KEY)) return Promise.resolve('sign_in')
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve('retry')
  session()?.setItem(REFRESH_PENDING_KEY, '1')
  const rotation = rotateRefreshToken(refresh_token)
  const result = (async (): Promise<RefreshResult> => {
    try {
      const rotated = await rotation
      if (generation !== sessionGeneration) return 'stale'
      if (rotated === 'retry') session()?.removeItem(REFRESH_PENDING_KEY)
      if (typeof rotated === 'string') return rotated
      setTokens(rotated.access_token, rotated.refresh_token)
      return 'refreshed'
    } catch {
      return generation === sessionGeneration ? 'sign_in' : 'stale'
    } finally {
      if (refreshing?.generation === generation) refreshing = undefined
    }
  })()
  refreshing = { generation, result, rotation }
  return result
}

const NO_RETRY = /^\/api\/v1\/auth\/(login|refresh|forgot-password|reset-password|activate|otp)/

async function request<T>(
  method: string,
  path: string,
  payload?: string,
  opts: { key?: string; binary?: boolean } = {},
  retried = false,
  generation = sessionGeneration,
): Promise<T> {
  assertSession(generation)
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (opts.key) headers['Idempotency-Key'] = opts.key
  if (payload !== undefined) headers['Content-Type'] = 'application/json'
  const retry = () => request<T>(method, path, payload, opts, false, generation)
  const { res, json } = await send(method, path, headers, payload, opts.binary).catch((error) => {
    assertSession(generation)
    if (opts.key && error instanceof ApiError && error.status === 0) {
      throw new MutationOutcomeUnknown(error.status, retry)
    }
    throw error
  })
  assertSession(generation)
  if (!res.ok) {
    if (res.status === 401 && !NO_RETRY.test(path)) {
      if (!retried && tokenStore.getRefresh()) {
        const result = token !== tokenStore.get() ? 'refreshed' : await refreshSession(generation)
        assertSession(generation)
        if (result === 'refreshed') {
          return request<T>(method, path, payload, opts, true, generation)
        }
        if (result === 'retry' || result === 'sign_in') {
          window.dispatchEvent(new CustomEvent<Recovery>('sakina:session-unverified', { detail: result }))
          throw new ApiError(0, 'تعذّر التحقق من الجلسة.', undefined, 'session_unverified', { recovery: result })
        }
      }
      expireSession(generation)
    }
    const error = await toError(res, json)
    if (opts.key && res.status >= 500 && error.code !== 'whatsapp_check_unavailable') {
      throw new MutationOutcomeUnknown(error.status, retry)
    }
    throw error
  }
  return json as T
}

export async function revokeCurrentSession(): Promise<void> {
  const token = tokenStore.get()
  const refresh = tokenStore.getRefresh()
  const pending = refreshing?.generation === sessionGeneration ? refreshing.rotation : undefined
  const uncertain = session()?.getItem(REFRESH_PENDING_KEY)
  tokenStore.clear()
  const signedOutGeneration = sessionGeneration
  const revoke = async (access: string) => {
    const { res, json } = await send('POST', '/api/v1/auth/logout', { Accept: 'application/json', Authorization: `Bearer ${access}` })
    if (!res.ok) throw await toError(res, json)
  }
  if (pending) {
    const rotated = await pending
    if (typeof rotated !== 'string') return revoke(rotated.access_token)
  }
  if (token) {
    try {
      return await revoke(token)
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || !refresh || uncertain ||
          signedOutGeneration !== sessionGeneration || navigator.onLine === false) throw error
    }
  }
  if (!refresh || uncertain || signedOutGeneration !== sessionGeneration || navigator.onLine === false) return
  const rotated = await rotateRefreshToken(refresh)
  if (typeof rotated === 'string') throw new ApiError(0, 'تعذّر تأكيد إنهاء الجلسة.', undefined, 'revocation_unknown')
  await revoke(rotated.access_token)
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  getBlob: (path: string) => request<Blob>('GET', path, undefined, { binary: true }),
  post: <T>(path: string, body?: unknown, idempotent = false) =>
    request<T>('POST', path, JSON.stringify(body), { key: idempotent ? crypto.randomUUID() : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, JSON.stringify(body)),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, JSON.stringify(body)),
  del: <T>(path: string) => request<T>('DELETE', path),
}

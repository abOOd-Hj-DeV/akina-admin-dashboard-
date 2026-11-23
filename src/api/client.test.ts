import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { json, stubBrowser } from '../test/storage'

async function load(url: string, mock: string) {
  vi.resetModules()
  vi.stubEnv('VITE_API_URL', url)
  vi.stubEnv('VITE_API_MOCK', mock)
  return import('./client')
}

afterEach(() => vi.unstubAllEnvs())

describe('اختيار مصدر البيانات', () => {
  it.each([
    ['', '', true],
    ['', 'true', true],
    ['', 'false', false],
    ['http://localhost:8000', '', false],
    ['http://localhost:8000', 'false', false],
    ['http://localhost:8000', 'true', true],
  ])('VITE_API_URL=%j VITE_API_MOCK=%j → mock=%j', async (url, mock, expected) => {
    expect((await load(url, mock)).API_MOCK).toBe(expected)
  })
})

describe('تخزين التوكنات والتجديد والمهلة', () => {
  const fetchMock = vi.fn()
  let env: ReturnType<typeof stubBrowser>
  let c: Awaited<ReturnType<typeof load>>

  beforeEach(async () => {
    env = stubBrowser()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    c = await load('', 'false')
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

  it('مفاتيح localStorage القديمة تُحذف عند التحميل', () => {
    env.local.setItem('sakina-token', 'old-acc')
    env.local.setItem('sakina-refresh', 'old-ref')
    env.local.setItem('other', 'keep')
    c.purgeLegacyTokens()
    expect(env.local.map.has('sakina-token')).toBe(false)
    expect(env.local.map.has('sakina-refresh')).toBe(false)
    expect(env.local.map.get('other')).toBe('keep')
  })
  it('التوكنات القديمة في localStorage لا تُستخدم أبداً', async () => {
    env.local.setItem('sakina-token', 'old-acc')
    fetchMock.mockResolvedValueOnce(json({ ok: true }))
    await c.api.get('/api/v1/admin/users')
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>).Authorization).toBeUndefined()
  })
  it('set يخزّن توكن الوصول في الذاكرة فقط', () => {
    c.tokenStore.set('acc', 'ref')
    expect(c.tokenStore.get()).toBe('acc')
    expect(env.session.map.get('sakina-refresh')).toBe('ref')
    expect([...env.session.map.values(), ...env.local.map.values()]).not.toContain('acc')
  })
  it('401 → تجديد مرة واحدة ثم إعادة الطلب بالتوكن الجديد', async () => {
    c.tokenStore.set('acc', 'ref')
    fetchMock
      .mockResolvedValueOnce(json({ message: 'Unauthenticated.' }, 401))
      .mockResolvedValueOnce(json({ access_token: 'acc2', refresh_token: 'ref2' }))
      .mockResolvedValueOnce(json({ data: [] }))
    await expect(c.api.get('/api/v1/admin/users')).resolves.toEqual({ data: [] })
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/v1/auth/refresh')
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer acc2')
    expect(env.session.map.get('sakina-refresh')).toBe('ref2')
  })
  it('فشل التجديد يمسح التوكنات ويطلق sakina:unauthenticated', async () => {
    c.tokenStore.set('acc', 'ref')
    fetchMock
      .mockResolvedValueOnce(json({ message: 'Unauthenticated.' }, 401))
      .mockResolvedValueOnce(json({ message: 'Invalid refresh token.' }, 401))
    await expect(c.api.get('/api/v1/admin/users')).rejects.toMatchObject({ status: 401 })
    expect(c.tokenStore.get()).toBeNull()
    expect(c.tokenStore.getRefresh()).toBeNull()
    expect(env.events).toContain('sakina:unauthenticated')
  })
  it('401 على مسارات الدخول لا يحاول التجديد', async () => {
    c.tokenStore.set('acc', 'ref')
    fetchMock.mockResolvedValueOnce(json({ message: 'Invalid credentials.' }, 401))
    await expect(c.api.post('/api/v1/auth/login', {}, false)).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('طلبات متزامنة بـ401 تستخدم تجديداً واحداً (توكن التجديد يُستعمل مرة واحدة)', async () => {
    c.tokenStore.set('acc', 'ref')
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.includes('/refresh')) return json({ access_token: 'acc2', refresh_token: 'ref2' })
      const auth = (init.headers as Record<string, string>).Authorization
      return auth === 'Bearer acc2' ? json({ ok: 1 }) : json({ message: 'Unauthenticated.' }, 401)
    })
    await Promise.all([c.api.get('/api/v1/a'), c.api.get('/api/v1/b')])
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('/refresh'))).toHaveLength(1)
  })
  it('مهلة الطلب 60 ثانية على الأقل وتنتهي بخطأ timeout', async () => {
    expect(c.REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(60_000)
    vi.useFakeTimers()
    fetchMock.mockImplementation((_u: string, init: RequestInit) => new Promise((_r, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }))
    const p = c.api.get('/api/v1/slow')
    const assertion = expect(p).rejects.toMatchObject({ code: 'timeout', status: 0 })
    await vi.advanceTimersByTimeAsync(59_000)
    await vi.advanceTimersByTimeAsync(1_000)
    await assertion
  })
  it('غلاف الخطأ يحفظ code و meta و errors', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'wait', code: 'otp_cooldown', errors: { otp: ['wait'] }, meta: { retry_after: 42 } }, 429))
    await expect(c.api.post('/api/v1/auth/login/2fa/resend', {}, false))
      .rejects.toMatchObject({ status: 429, code: 'otp_cooldown', meta: { retry_after: 42 }, errors: { otp: ['wait'] } })
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { activateApi, loginApi, verifyLogin2faApi } from './auth'

const store = new Map<string, string>()
const fetchMock = vi.fn()

function reply(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

beforeEach(() => {
  store.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
})
afterEach(() => vi.unstubAllGlobals())

const tokens = { message: 'ok', user: { role: 'super_admin' }, access_token: 'acc', refresh_token: 'ref' }

describe('مصادقة الإدارة', () => {
  it('رد 2FA لا يخزّن توكن', async () => {
    reply({ requires_2fa: true, message: 'sent' })
    const res = await loginApi('0991325723', 'secret123')
    expect(res).toEqual({ requires_2fa: true, message: 'sent' })
    expect(store.size).toBe(0)
  })
  it('الدخول المباشر يخزّن التوكن', async () => {
    reply(tokens)
    await loginApi('0991325723', 'secret123')
    expect(store.get('sakina-token')).toBe('acc')
  })
  it('تأكيد رمز 2FA يرسل otp ويخزّن التوكن', async () => {
    reply(tokens)
    await verifyLogin2faApi('0991325723', '123456')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/auth/login/2fa')
    expect(JSON.parse(init.body)).toEqual({ whatsapp_number: '0991325723', otp: '123456' })
    expect(store.get('sakina-token')).toBe('acc')
  })
  it('التفعيل يرسل الرمز وتأكيد كلمة المرور', async () => {
    reply({ message: 'activated', user: {} })
    await activateApi('0991325723', 'ABCD2345', 'secret123', 'secret123')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/auth/activate')
    expect(JSON.parse(init.body)).toEqual({ whatsapp_number: '0991325723', code: 'ABCD2345', password: 'secret123', password_confirmation: 'secret123' })
  })
  it('خطأ التحقق يظهر كـ ApiError', async () => {
    reply({ message: 'Invalid or expired activation code.', errors: { code: ['Invalid or expired activation code.'] } }, 422)
    await expect(activateApi('0991325723', 'ABCD2345', 'secret123', 'secret123')).rejects.toMatchObject({ status: 422 })
  })
})

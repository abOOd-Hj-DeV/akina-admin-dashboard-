import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  activateApi, changePasswordApi, forgotPasswordApi, loginApi, logoutAllApi, logoutApi, refreshApi,
  resendLogin2faApi, resetPasswordApi, restoreSessionApi, verifyLogin2faApi,
} from './auth'
import { tokenStore } from './client'
import { json, stubBrowser } from '../test/storage'

const fetchMock = vi.fn()
let env: ReturnType<typeof stubBrowser>

const reply = (body: unknown, status = 200) => fetchMock.mockResolvedValueOnce(json(body, status))
const call = (i = 0) => {
  const [url, init] = fetchMock.mock.calls[i]
  return { url: url as string, init: init as RequestInit, body: init.body ? JSON.parse(init.body as string) : undefined }
}

beforeEach(() => {
  env = stubBrowser()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  tokenStore.clear()
})
afterEach(() => vi.unstubAllGlobals())

const tokens = { message: 'ok', user: { id: 'staff-r', role: 'super_admin', name: 'R' }, access_token: 'acc', refresh_token: 'ref' }

describe('مصادقة الإدارة', () => {
  it('رد 2FA لا يخزّن توكن', async () => {
    reply({ requires_2fa: true, message: 'sent', login_challenge: 'chal-1' })
    const res = await loginApi('+963991325723', 'secret123')
    expect(res).toEqual({ requires_2fa: true, message: 'sent', login_challenge: 'chal-1' })
    expect(tokenStore.get()).toBeNull()
    expect(env.session.map.size).toBe(0)
  })
  it('الدخول المباشر: توكن الوصول في الذاكرة فقط وتوكن التجديد في sessionStorage', async () => {
    reply(tokens)
    await loginApi('+963991325723', 'secret123')
    expect(tokenStore.get()).toBe('acc')
    expect(env.session.map.get('sakina-refresh')).toBe('ref')
    expect([...env.session.map.values()]).not.toContain('acc')
    expect(env.local.map.size).toBe(0)
  })
  it('تأكيد رمز 2FA يرسل otp مع login_challenge ويخزّن التوكن', async () => {
    reply(tokens)
    await verifyLogin2faApi('+963991325723', '123456', 'chal-1')
    const { url, body } = call()
    expect(url).toContain('/api/v1/auth/login/2fa')
    expect(body).toEqual({ whatsapp_number: '+963991325723', otp: '123456', login_challenge: 'chal-1' })
    expect(tokenStore.get()).toBe('acc')
    expect(env.local.map.size).toBe(0)
  })
  it('إعادة إرسال 2FA ترسل login_challenge', async () => {
    reply({ message: 'sent' })
    await resendLogin2faApi('+963991325723', 'chal-1')
    const { url, body } = call()
    expect(url).toContain('/api/v1/auth/login/2fa/resend')
    expect(body).toEqual({ whatsapp_number: '+963991325723', login_challenge: 'chal-1' })
  })
  it('refresh يرسل refresh_token المخزّن ويستبدل التوكنات', async () => {
    env.session.setItem('sakina-refresh', 'ref-old')
    reply({ ...tokens, access_token: 'acc2', refresh_token: 'ref2' })
    await refreshApi()
    const { url, body } = call()
    expect(url).toContain('/api/v1/auth/refresh')
    expect(body).toEqual({ refresh_token: 'ref-old' })
    expect(tokenStore.get()).toBe('acc2')
    expect(env.session.map.get('sakina-refresh')).toBe('ref2')
  })
  it('refresh بدون refresh_token لا يستدعي الباك اند', async () => {
    await expect(refreshApi()).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('استعادة الجلسة عند التحميل: refresh ثم /auth/user', async () => {
    env.session.setItem('sakina-refresh', 'ref-old')
    reply({ ...tokens, access_token: 'acc2', refresh_token: 'ref2' })
    reply({ user: { id: 'staff-a', role: 'admin', name: 'A' } })
    const user = await restoreSessionApi()
    expect(user).toMatchObject({ role: 'admin' })
    expect(call(1).url).toContain('/api/v1/auth/user')
    expect((call(1).init.headers as Record<string, string>).Authorization).toBe('Bearer acc2')
  })
  it('استعادة متزامنة (StrictMode) ترسل refresh واحداً فقط', async () => {
    env.session.setItem('sakina-refresh', 'ref-old')
    reply({ ...tokens, access_token: 'acc2', refresh_token: 'ref2' })
    reply({ user: { id: 'staff-a', role: 'admin', name: 'A' } })
    const [a, b] = await Promise.all([restoreSessionApi(), restoreSessionApi()])
    expect(a).toEqual(b)
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('/refresh'))).toHaveLength(1)
  })
  it('فشل التجديد عند التحميل يمسح التوكنات', async () => {
    env.session.setItem('sakina-refresh', 'ref-old')
    reply({ message: 'Invalid refresh token.' }, 401)
    expect(await restoreSessionApi()).toBeNull()
    expect(tokenStore.get()).toBeNull()
    expect(tokenStore.getRefresh()).toBeNull()
  })
  it('بدون توكن تجديد لا تُستعاد الجلسة ولا يُستدعى الخادم', async () => {
    expect(await restoreSessionApi()).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('retains credentials when opened offline and restores after reconnecting', async () => {
    env.session.setItem('sakina-refresh', 'ref-old')
    const connection = { onLine: false }
    vi.stubGlobal('navigator', connection)
    expect(await restoreSessionApi()).toEqual({ recovery: 'retry' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(tokenStore.getRefresh()).toBe('ref-old')
    connection.onLine = true
    reply(tokens)
    reply({ user: tokens.user })
    expect(await restoreSessionApi()).toEqual(tokens.user)
  })
  it.each([0, 503])('does not replay a refresh after an uncertain outcome (%s)', async (status) => {
    env.session.setItem('sakina-refresh', 'ref-old')
    if (status) reply({ message: 'unavailable' }, status)
    else fetchMock.mockRejectedValueOnce(new TypeError('connection lost'))
    expect(await restoreSessionApi()).toEqual({ recovery: 'sign_in' })
    expect(tokenStore.getRefresh()).toBe('ref-old')
    expect(await restoreSessionApi()).toEqual({ recovery: 'sign_in' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('retries only the user check if the refresh already succeeded', async () => {
    env.session.setItem('sakina-refresh', 'ref-old')
    reply(tokens)
    reply({ message: 'unavailable' }, 503)
    expect(await restoreSessionApi()).toEqual({ recovery: 'retry' })
    expect(tokenStore.getRefresh()).toBe('ref')
    reply({ user: tokens.user })
    expect(await restoreSessionApi()).toEqual(tokens.user)
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('/refresh'))).toHaveLength(1)
  })
  it('التفعيل يرسل الرمز وتأكيد كلمة المرور', async () => {
    reply({ message: 'activated', user: {} })
    await activateApi('+963991325723', 'ABCD2345', 'secret123', 'secret123')
    const { url, body } = call()
    expect(url).toContain('/api/v1/auth/activate')
    expect(body).toEqual({ whatsapp_number: '+963991325723', code: 'ABCD2345', password: 'secret123', password_confirmation: 'secret123' })
  })
  it('خطأ التحقق يظهر كـ ApiError مع code و meta', async () => {
    reply({ message: 'Invalid code.', code: 'otp_invalid', errors: { otp: ['Invalid code.'] }, meta: { attempts_left: 2 } }, 422)
    await expect(activateApi('+963991325723', 'ABCD2345', 'secret123', 'secret123'))
      .rejects.toMatchObject({ status: 422, code: 'otp_invalid', meta: { attempts_left: 2 } })
  })
})

describe('شاشات الحساب', () => {
  it('استعادة كلمة المرور: forgot-password ثم reset-password', async () => {
    reply({ message: 'sent' })
    await forgotPasswordApi('+963990000000')
    reply({ message: 'reset' })
    await resetPasswordApi('+963990000000', '123456', 'abcdefg1', 'abcdefg1')
    expect(call(0).url).toContain('/api/v1/auth/forgot-password')
    expect(call(0).body).toEqual({ whatsapp_number: '+963990000000' })
    expect(call(1).url).toContain('/api/v1/auth/reset-password')
    expect(call(1).body).toEqual({ whatsapp_number: '+963990000000', otp: '123456', password: 'abcdefg1', password_confirmation: 'abcdefg1' })
    expect((call(1).init.headers as Record<string, string>).Authorization).toBeUndefined()
  })
  it('تغيير كلمة المرور: PUT /auth/user/password مع التوكن', async () => {
    tokenStore.set('acc', 'ref')
    reply({ message: 'changed' })
    await changePasswordApi('old-pass1', 'new-pass1', 'new-pass1')
    const { url, init, body } = call()
    expect(url).toContain('/api/v1/auth/user/password')
    expect(init.method).toBe('PUT')
    expect(body).toEqual({ current_password: 'old-pass1', password: 'new-pass1', password_confirmation: 'new-pass1' })
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer acc')
  })
  it('password_reused يصل كـ ApiError', async () => {
    tokenStore.set('acc', 'ref')
    reply({ message: 'reused', code: 'password_reused', errors: { password: ['reused'] } }, 422)
    await expect(changePasswordApi('a', 'b', 'b')).rejects.toMatchObject({ code: 'password_reused' })
  })
  it('تسجيل الخروج من كل الأجهزة يستدعي logout-all ويمسح التوكنات', async () => {
    tokenStore.set('acc', 'ref')
    reply({ message: 'ok' })
    await logoutAllApi()
    expect(call().url).toContain('/api/v1/auth/logout-all')
    expect(tokenStore.get()).toBeNull()
    expect(tokenStore.getRefresh()).toBeNull()
  })
  it('تسجيل الخروج يمسح التوكنات حتى لو فشل الطلب', async () => {
    tokenStore.set('acc', 'ref')
    reply({ message: 'boom' }, 500)
    await expect(logoutApi()).rejects.toBeTruthy()
    expect(tokenStore.get()).toBeNull()
    expect(tokenStore.getRefresh()).toBeNull()
  })
  it('revokes the session after an expired access token without restoring local credentials', async () => {
    tokenStore.set('expired-access', 'current-refresh')
    reply({}, 401)
    reply({ access_token: 'rotated-access', refresh_token: 'rotated-refresh' })
    reply({})
    const pending = logoutApi()
    expect(tokenStore.get()).toBeNull()
    expect(tokenStore.getRefresh()).toBeNull()
    await pending
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(call(1).url).toContain('/api/v1/auth/refresh')
    expect(call(1).body).toEqual({ refresh_token: 'current-refresh' })
    expect(call(2).url).toContain('/api/v1/auth/logout')
    expect(call(2).init.headers).toMatchObject({ Authorization: 'Bearer rotated-access' })
    expect(tokenStore.get()).toBeNull()
    expect(tokenStore.getRefresh()).toBeNull()
  })
  it.each([200, 401, 500])('رد خروج قديم (%s) لا يمس الجلسة الجديدة', async (status) => {
    let finish!: (response: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve }))
    tokenStore.set('old-access', 'old-refresh')
    const pending = logoutApi().catch(() => undefined)
    expect(tokenStore.get()).toBeNull()
    expect((call().init.headers as Record<string, string>).Authorization).toBe('Bearer old-access')
    reply(tokens)
    await loginApi('+963990000000', 'secret123')
    finish(json({ message: 'done' }, status))
    await pending
    expect(tokenStore.get()).toBe('acc')
    expect(tokenStore.getRefresh()).toBe('ref')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

/** مصادقة /api/v1/auth — login يرجع توكن + دور المستخدم، أو يطلب رمز 2FA لحسابات الإدارة */
import { api, ApiError, assertSession, expireSession, refreshSession, revokeCurrentSession, tokenStore, type Recovery } from './client'
import type { AuthResponse, ApiUser, TwoFactorChallenge } from './types'

export async function loginApi(whatsapp_number: string, password: string): Promise<AuthResponse | TwoFactorChallenge> {
  const generation = tokenStore.generation()
  const res = await api.post<AuthResponse | TwoFactorChallenge>('/api/v1/auth/login', { whatsapp_number, password }, false)
  assertSession(generation)
  if ('requires_2fa' in res && res.requires_2fa) return res
  const auth = res as AuthResponse
  tokenStore.set(auth.access_token, auth.refresh_token)
  return auth
}

/** الخطوة الثانية: الباك اند يربط الـOTP بـlogin_challenge ويرفض الطلب بدونه (422) */
export async function verifyLogin2faApi(whatsapp_number: string, otp: string, login_challenge: string): Promise<AuthResponse> {
  const generation = tokenStore.generation()
  const res = await api.post<AuthResponse>('/api/v1/auth/login/2fa', { whatsapp_number, otp, login_challenge }, false)
  assertSession(generation)
  tokenStore.set(res.access_token, res.refresh_token)
  return res
}

export const resendLogin2faApi = (whatsapp_number: string, login_challenge: string) =>
  api.post<{ message: string }>('/api/v1/auth/login/2fa/resend', { whatsapp_number, login_challenge }, false)

export const activateApi = (whatsapp_number: string, code: string, password: string, password_confirmation: string) =>
  api.post<{ message: string; user: ApiUser }>('/api/v1/auth/activate', { whatsapp_number, code, password, password_confirmation }, false)

/** استعادة كلمة المرور: يرسل رمزاً عبر واتساب (الرد لا يكشف وجود الحساب) */
export const forgotPasswordApi = (whatsapp_number: string) =>
  api.post<{ message: string }>('/api/v1/auth/forgot-password', { whatsapp_number }, false)

export const resetPasswordApi = (whatsapp_number: string, otp: string, password: string, password_confirmation: string) =>
  api.post<{ message: string }>('/api/v1/auth/reset-password', { whatsapp_number, otp, password, password_confirmation }, false)

export const changePasswordApi = (current_password: string, password: string, password_confirmation: string) =>
  api.put<{ message: string }>('/api/v1/auth/user/password', { current_password, password, password_confirmation })

/** /auth/refresh يتطلب refresh_token في الجسم؛ بدونه 422 */
export async function refreshApi(): Promise<void> {
  const generation = tokenStore.generation()
  const result = await refreshSession(generation)
  if (result === 'invalid') expireSession(generation)
  if (result !== 'refreshed') throw new Error('refresh failed')
}

export const meApi = () => api.get<{ user: ApiUser }>('/api/v1/auth/user')

type RestoredSession = ApiUser | { recovery: Recovery } | null
let restoring: { generation: number; result: Promise<RestoredSession> } | undefined

/** عند تحميل الصفحة: توكن الوصول غير محفوظ، فنجدّده من توكن التجديد ثم نقرأ المستخدم */
export function restoreSessionApi(): Promise<RestoredSession> {
  const generation = tokenStore.generation()
  if (restoring?.generation === generation) return restoring.result
  const result = (async (): Promise<RestoredSession> => {
    try {
      if (!tokenStore.getRefresh()) return null
      if (!tokenStore.get()) {
        const refreshed = await refreshSession(generation)
        assertSession(generation)
        if (refreshed === 'invalid') { expireSession(generation); return null }
        if (refreshed === 'retry' || refreshed === 'sign_in') return { recovery: refreshed }
      }
      assertSession(generation)
      const { user } = await meApi()
      assertSession(generation)
      return user?.id && user.role ? user : { recovery: 'retry' }
    } catch (error) {
      if (generation !== tokenStore.generation()) return null
      return { recovery: error instanceof ApiError && error.meta?.recovery === 'sign_in' ? 'sign_in' : 'retry' }
    }
  })()
  restoring = { generation, result }
  return result.finally(() => {
    if (restoring?.generation === generation) restoring = undefined
  })
}

export const logoutApi = revokeCurrentSession

export async function logoutAllApi(): Promise<void> {
  const generation = tokenStore.generation()
  await api.post('/api/v1/auth/logout-all', {}, false)
  assertSession(generation)
  tokenStore.clear()
}

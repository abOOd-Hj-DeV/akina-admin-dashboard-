/** مصادقة /api/v1/auth — login يرجع توكن + دور المستخدم، أو يطلب رمز 2FA لحسابات الإدارة */
import { api, refreshSession, tokenStore } from './client'
import type { AuthResponse, ApiUser, TwoFactorChallenge } from './types'

export async function loginApi(whatsapp_number: string, password: string): Promise<AuthResponse | TwoFactorChallenge> {
  const res = await api.post<AuthResponse | TwoFactorChallenge>('/api/v1/auth/login', { whatsapp_number, password }, false)
  if ('requires_2fa' in res && res.requires_2fa) return res
  const auth = res as AuthResponse
  tokenStore.set(auth.access_token, auth.refresh_token)
  return auth
}

/** الخطوة الثانية: الباك اند يربط الـOTP بـlogin_challenge ويرفض الطلب بدونه (422) */
export async function verifyLogin2faApi(whatsapp_number: string, otp: string, login_challenge: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/v1/auth/login/2fa', { whatsapp_number, otp, login_challenge }, false)
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
  if (!tokenStore.getRefresh()) throw new Error('no refresh token')
  if (!(await refreshSession())) throw new Error('refresh failed')
}

export const meApi = () => api.get<{ user: ApiUser }>('/api/v1/auth/user')

let restoring: Promise<ApiUser | null> | null = null

/** عند تحميل الصفحة: توكن الوصول غير محفوظ، فنجدّده من توكن التجديد ثم نقرأ المستخدم */
export function restoreSessionApi(): Promise<ApiUser | null> {
  if (restoring) return restoring
  restoring = (async () => {
    try {
      if (!tokenStore.getRefresh() || !(await refreshSession())) { tokenStore.clear(); return null }
      return (await meApi()).user
    } catch {
      tokenStore.clear()
      return null
    } finally {
      restoring = null
    }
  })()
  return restoring
}

export async function logoutApi(): Promise<void> {
  try { await api.post('/api/v1/auth/logout', {}, false) } finally { tokenStore.clear() }
}

export async function logoutAllApi(): Promise<void> {
  await api.post('/api/v1/auth/logout-all', {}, false)
  tokenStore.clear()
}

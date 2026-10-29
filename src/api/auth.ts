/** مصادقة /api/v1/auth — login يرجع توكن + دور المستخدم، أو يطلب رمز 2FA لحسابات الإدارة */
import { api, tokenStore } from './client'
import type { AuthResponse, ApiUser, TwoFactorChallenge } from './types'

export async function loginApi(whatsapp_number: string, password: string): Promise<AuthResponse | TwoFactorChallenge> {
  const res = await api.post<AuthResponse | TwoFactorChallenge>('/api/v1/auth/login', { whatsapp_number, password }, false)
  if ('requires_2fa' in res && res.requires_2fa) return res
  const auth = res as AuthResponse
  tokenStore.set(auth.access_token, auth.refresh_token)
  return auth
}

export async function verifyLogin2faApi(whatsapp_number: string, otp: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/v1/auth/login/2fa', { whatsapp_number, otp }, false)
  tokenStore.set(res.access_token, res.refresh_token)
  return res
}

export const resendLogin2faApi = (whatsapp_number: string) =>
  api.post<{ message: string }>('/api/v1/auth/login/2fa/resend', { whatsapp_number }, false)

export const activateApi = (whatsapp_number: string, code: string, password: string, password_confirmation: string) =>
  api.post<{ message: string; user: ApiUser }>('/api/v1/auth/activate', { whatsapp_number, code, password, password_confirmation }, false)

export async function refreshApi(): Promise<void> {
  const res = await api.post<AuthResponse>('/api/v1/auth/refresh', {}, false)
  tokenStore.set(res.access_token, res.refresh_token)
}

export const meApi = () => api.get<{ user: ApiUser }>('/api/v1/auth/user')

export async function logoutApi(): Promise<void> {
  try { await api.post('/api/v1/auth/logout', {}, false) } finally { tokenStore.clear() }
}

/** مصادقة /api/v1/auth — login يرجع توكن + دور المستخدم */
import { api, tokenStore } from './client'
import type { AuthResponse, ApiUser } from './types'

export async function loginApi(whatsapp_number: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/v1/auth/login', { whatsapp_number, password }, false)
  tokenStore.set(res.access_token, res.refresh_token)
  return res
}

export async function refreshApi(): Promise<void> {
  const res = await api.post<AuthResponse>('/api/v1/auth/refresh', {}, false)
  tokenStore.set(res.access_token, res.refresh_token)
}

export const meApi = () => api.get<{ user: ApiUser }>('/api/v1/auth/user')

export async function logoutApi(): Promise<void> {
  try { await api.post('/api/v1/auth/logout', {}, false) } finally { tokenStore.clear() }
}

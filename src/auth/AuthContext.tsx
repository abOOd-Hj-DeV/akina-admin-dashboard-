import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Role } from '../types'
import { loginApi, logoutApi } from '../api/auth'
import { tokenStore } from '../api/client'
import type { ApiRole } from '../api/types'

const ADMIN_ROLES = new Set<ApiRole>([
  'super_admin', 'admin', 'clinical_supervisor', 'finance_partner', 'support_agent', 'content_manager',
])

interface AuthState {
  role: Role | null
  /** دخول تجريبي (وضع الـmock) */
  login: (role: Role) => void
  /** دخول حقيقي عبر /api/v1/auth/login — يقبل أدوار الإدارة فقط */
  apiLogin: (whatsapp: string, password: string) => Promise<Role>
  logout: () => void
}

const Ctx = createContext<AuthState>({ role: null, login: () => {}, apiLogin: async () => 'admin', logout: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(() => {
    const s = sessionStorage.getItem('sakina-role')
    return (s as Role) || null
  })

  // 401 من أي استدعاء API → إنهاء الجلسة
  useEffect(() => {
    const onUnauth = () => setRole(null)
    window.addEventListener('sakina:unauthenticated', onUnauth)
    return () => window.removeEventListener('sakina:unauthenticated', onUnauth)
  }, [])

  const login = (r: Role) => {
    sessionStorage.setItem('sakina-role', r)
    setRole(r)
  }

  const apiLogin = async (whatsapp: string, password: string): Promise<Role> => {
    const res = await loginApi(whatsapp, password)
    if (!ADMIN_ROLES.has(res.user.role)) {
      tokenStore.clear()
      throw new Error('هذا الحساب ليس حساب إدارة — استخدم تطبيق المريض أو بوابة المعالج')
    }
    const r = res.user.role as Role
    sessionStorage.setItem('sakina-role', r)
    setRole(r)
    return r
  }

  const logout = () => {
    sessionStorage.removeItem('sakina-role')
    void logoutApi().catch(() => tokenStore.clear())
    setRole(null)
  }
  return <Ctx.Provider value={{ role, login, apiLogin, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)

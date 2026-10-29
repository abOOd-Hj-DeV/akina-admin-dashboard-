import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Role } from '../types'
import { loginApi, logoutApi, verifyLogin2faApi } from '../api/auth'
import { tokenStore } from '../api/client'
import type { ApiRole, AuthResponse } from '../api/types'

const ADMIN_ROLES = new Set<ApiRole>([
  'super_admin', 'admin', 'clinical_supervisor', 'finance_partner', 'support_agent', 'content_manager',
])

interface AuthState {
  role: Role | null
  /** اسم المستخدم المعروض في بطاقة الملف الشخصي */
  userName: string | null
  /** دخول تجريبي (وضع الـmock) */
  login: (role: Role) => void
  /** دخول حقيقي عبر /api/v1/auth/login — يقبل أدوار الإدارة فقط؛ يرجع '2fa' إذا أُرسل رمز تحقق */
  apiLogin: (whatsapp: string, password: string) => Promise<Role | '2fa'>
  /** الخطوة الثانية: رمز واتساب عبر /api/v1/auth/login/2fa */
  apiVerify2fa: (whatsapp: string, otp: string) => Promise<Role>
  logout: () => void
}

const Ctx = createContext<AuthState>({
  role: null, userName: null, login: () => {}, apiLogin: async () => 'admin', apiVerify2fa: async () => 'admin', logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(() => {
    const s = sessionStorage.getItem('sakina-role')
    return (s as Role) || null
  })
  const [userName, setUserName] = useState<string | null>(() => sessionStorage.getItem('sakina-user-name'))

  // 401 من أي استدعاء API → إنهاء الجلسة
  useEffect(() => {
    const onUnauth = () => { setRole(null); setUserName(null) }
    window.addEventListener('sakina:unauthenticated', onUnauth)
    return () => window.removeEventListener('sakina:unauthenticated', onUnauth)
  }, [])

  const login = (r: Role) => {
    sessionStorage.setItem('sakina-role', r)
    sessionStorage.removeItem('sakina-user-name')
    setUserName(null)
    setRole(r)
  }

  const finishLogin = (res: AuthResponse): Role => {
    if (!ADMIN_ROLES.has(res.user.role)) {
      tokenStore.clear()
      throw new Error('هذا الحساب ليس حساب إدارة — استخدم تطبيق المريض أو بوابة المعالج')
    }
    const r = res.user.role as Role
    sessionStorage.setItem('sakina-role', r)
    sessionStorage.setItem('sakina-user-name', res.user.name)
    setUserName(res.user.name)
    setRole(r)
    return r
  }

  const apiLogin = async (whatsapp: string, password: string): Promise<Role | '2fa'> => {
    const res = await loginApi(whatsapp, password)
    if ('requires_2fa' in res) return '2fa'
    return finishLogin(res)
  }

  const apiVerify2fa = async (whatsapp: string, otp: string): Promise<Role> =>
    finishLogin(await verifyLogin2faApi(whatsapp, otp))

  const logout = () => {
    sessionStorage.removeItem('sakina-role')
    sessionStorage.removeItem('sakina-user-name')
    void logoutApi().catch(() => tokenStore.clear())
    setUserName(null)
    setRole(null)
  }
  return <Ctx.Provider value={{ role, userName, login, apiLogin, apiVerify2fa, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)

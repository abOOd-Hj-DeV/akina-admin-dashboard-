import { createContext, useContext, useEffect, useState, type ReactNode, useRef } from 'react'
import type { Role } from '../types'
import { loginApi, logoutAllApi, logoutApi, resendLogin2faApi, restoreSessionApi, verifyLogin2faApi } from '../api/auth'
import { API_MOCK, assertSession, tokenStore } from '../api/client'
import type { ApiRole, ApiUser, AuthResponse } from '../api/types'

const ADMIN_ROLES = new Set<ApiRole>([
  'super_admin', 'admin', 'clinical_supervisor', 'finance_partner', 'support_agent', 'content_manager',
])

interface AuthState {
  role: Role | null
  userId: string | null
  /** اسم المستخدم المعروض في بطاقة الملف الشخصي */
  userName: string | null
  /** false أثناء استعادة الجلسة من توكن التجديد عند تحميل الصفحة */
  ready: boolean
  /** دخول تجريبي (وضع الـmock) */
  login: (role: Role) => void
  /** دخول حقيقي عبر /api/v1/auth/login — يقبل أدوار الإدارة فقط؛ يرجع '2fa' إذا أُرسل رمز تحقق */
  apiLogin: (whatsapp: string, password: string) => Promise<Role | '2fa'>
  /** الخطوة الثانية: رمز واتساب عبر /api/v1/auth/login/2fa */
  apiVerify2fa: (whatsapp: string, otp: string) => Promise<Role>
  /** إعادة إرسال رمز 2FA للتحدي الجاري */
  apiResend2fa: (whatsapp: string) => Promise<void>
  logout: () => void
  /** إنهاء كل الجلسات على كل الأجهزة (بما فيها هذه) */
  logoutAll: () => Promise<void>
}

const Ctx = createContext<AuthState>({
  role: null, userId: null, userName: null, ready: true, login: () => {}, apiLogin: async () => 'admin', apiVerify2fa: async () => 'admin',
  apiResend2fa: async () => {}, logout: () => {}, logoutAll: async () => {},
})

const clearSessionKeys = () => {
  sessionStorage.removeItem('sakina-role')
  sessionStorage.removeItem('sakina-user-name')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // الوضع الحي: الدور يُستعاد من الخادم فقط (لا نثق بقيمة مخزّنة بدون توكن)
  const [role, setRole] = useState<Role | null>(() => (API_MOCK ? (sessionStorage.getItem('sakina-role') as Role) || null : null))
  const [userName, setUserName] = useState<string | null>(() => (API_MOCK ? sessionStorage.getItem('sakina-user-name') : null))
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState<boolean>(() => API_MOCK || !tokenStore.getRefresh())
  const challengeRef = useRef<string | null>(null)

  const applyUser = (user: ApiUser): Role => {
    if (!ADMIN_ROLES.has(user.role)) {
      tokenStore.clear()
      throw new Error('هذا الحساب ليس حساب إدارة — استخدم تطبيق المريض أو بوابة المعالج')
    }
    const r = user.role as Role
    sessionStorage.setItem('sakina-role', r)
    sessionStorage.setItem('sakina-user-name', user.name)
    setUserName(user.name)
    setUserId(user.id)
    setRole(r)
    return r
  }

  const reset = () => {
    challengeRef.current = null
    clearSessionKeys()
    setRole(null)
    setUserId(null)
    setUserName(null)
    setReady(true)
  }

  useEffect(() => {
    if (API_MOCK) return
    if (!tokenStore.getRefresh()) { clearSessionKeys(); return }
    const generation = tokenStore.generation()
    let live = true
    void restoreSessionApi().then((user) => {
      if (!live || generation !== tokenStore.generation()) return
      try {
        if (user) applyUser(user)
        else reset()
      } catch { reset() }
      setReady(true)
    })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 401 من أي استدعاء API (بعد فشل التجديد) → إنهاء الجلسة
  useEffect(() => {
    const onUnauth = () => reset()
    window.addEventListener('sakina:unauthenticated', onUnauth)
    return () => window.removeEventListener('sakina:unauthenticated', onUnauth)
  }, [])

  const login = (r: Role) => {
    sessionStorage.setItem('sakina-role', r)
    sessionStorage.removeItem('sakina-user-name')
    setUserName(null)
    setUserId(null)
    setRole(r)
  }

  const finishLogin = (res: AuthResponse): Role => applyUser(res.user)

  const apiLogin = async (whatsapp: string, password: string): Promise<Role | '2fa'> => {
    tokenStore.clear()
    reset()
    const generation = tokenStore.generation()
    const res = await loginApi(whatsapp, password)
    if ('requires_2fa' in res) {
      assertSession(generation)
      // الباك اند يربط الـOTP بهذا التحدي؛ نحتفظ به في الذاكرة فقط (لا تخزين)
      challengeRef.current = res.login_challenge
      return '2fa'
    }
    assertSession(generation + 1)
    return finishLogin(res)
  }

  const apiVerify2fa = async (whatsapp: string, otp: string): Promise<Role> => {
    const challenge = challengeRef.current
    if (!challenge) throw new Error('انتهى طلب الدخول، أعد إدخال رقمك وكلمة المرور.')
    const generation = tokenStore.generation()
    const auth = await verifyLogin2faApi(whatsapp, otp, challenge)
    assertSession(generation + 1)
    challengeRef.current = null
    return finishLogin(auth)
  }

  const apiResend2fa = async (whatsapp: string): Promise<void> => {
    const challenge = challengeRef.current
    if (!challenge) throw new Error('انتهى طلب الدخول، أعد إدخال رقمك وكلمة المرور.')
    await resendLogin2faApi(whatsapp, challenge)
  }

  const logout = () => {
    void logoutApi().catch(() => undefined)
    reset()
  }

  const logoutAll = async () => {
    const generation = tokenStore.generation()
    await logoutAllApi()
    assertSession(generation + 1)
    reset()
  }

  return (
    <Ctx.Provider value={{ role, userId, userName, ready, login, apiLogin, apiVerify2fa, apiResend2fa, logout, logoutAll }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)

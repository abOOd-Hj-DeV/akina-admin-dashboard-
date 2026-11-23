import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import type { Role } from '../types'
import { stubBrowser } from '../test/storage'

const auth = vi.hoisted(() => ({ role: null as Role | null, ready: true }))
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    role: auth.role, userName: 'U', ready: auth.ready, login: () => {}, apiLogin: async () => 'admin',
    apiVerify2fa: async () => 'admin', apiResend2fa: async () => {}, logout: () => {}, logoutAll: async () => {},
  }),
}))

// وضع الباك اند الحقيقي (VITE_API_MOCK=false) — تُستورد الشاشات بعد ضبط المتغيرات
async function render(load: () => Promise<{ default: () => ReactElement | null }>, role: Role | null = null) {
  auth.role = role
  const { default: Screen } = await load()
  return renderToStaticMarkup(<MemoryRouter><Screen /></MemoryRouter>)
}

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_API_URL', '')
  vi.stubEnv('VITE_API_MOCK', 'false')
  stubBrowser()
  auth.ready = true
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

const selectedCountry = (html: string) => /<option value="([A-Z]{2})" selected="">/.exec(html)?.[1]

describe('الشاشات', () => {
  it('الدخول: حقل واتساب بدولة افتراضية سوريا + رابط استعادة كلمة المرور', async () => {
    const html = await render(() => import('./Login'))
    expect(selectedCountry(html)).toBe('SY')
    expect(html).toContain('href="/forgot-password"')
  })
  it('الدخول معطّل أثناء استعادة الجلسة (لا سباق بين التجديد والدخول الجديد)', async () => {
    auth.ready = false
    const html = await render(() => import('./Login'))
    expect(html).toContain('جارٍ استعادة الجلسة')
    expect(html).not.toContain('رمز الدولة')
  })
  it('وضع العرض التجريبي لا يعرض استعادة كلمة المرور الحقيقية', async () => {
    vi.stubEnv('VITE_API_MOCK', 'true')
    expect(await render(() => import('./Login'))).not.toContain('/forgot-password')
  })
  it('استعادة كلمة المرور: تبدأ بحقل الرقم (سوريا افتراضياً)', async () => {
    const html = await render(() => import('./ForgotPassword'))
    expect(html).toContain('استعادة كلمة المرور')
    expect(selectedCountry(html)).toBe('SY')
    expect(html).toContain('إرسال الرمز')
  })
  it('حسابي: تغيير كلمة المرور (الحالية + الجديدة + التأكيد) وتسجيل الخروج من كل الأجهزة', async () => {
    const html = await render(() => import('./Account'), 'finance_partner')
    for (const label of ['كلمة المرور الحالية', 'كلمة المرور الجديدة', 'تأكيد كلمة المرور الجديدة']) expect(html).toContain(`aria-label="${label}"`)
    expect(html).toContain('تسجيل الخروج من كل الأجهزة')
  })
  it('المستخدمون: عمود واتساب في الجدول', async () => {
    const html = await render(() => import('./Users'), 'admin')
    expect(html).toContain('واتساب')
    expect(html).toContain('+ دعوة مستخدم')
  })
  it.each(['super_admin', 'admin', 'clinical_supervisor'] as Role[])('المعالجون: زر دعوة معالج ظاهر لـ%s', async (role) => {
    expect(await render(() => import('./Therapists'), role)).toContain('+ دعوة معالج')
  })
  it.each(['finance_partner', 'support_agent', 'content_manager'] as Role[])('المعالجون: لا زر دعوة لـ%s', async (role) => {
    expect(await render(() => import('./Therapists'), role)).not.toContain('دعوة معالج')
  })
  it('المشرف السريري يرى الدعوة فقط بدون قائمة المعالجين', async () => {
    const html = await render(() => import('./Therapists'), 'clinical_supervisor')
    expect(html).not.toContain('<table')
    expect(await render(() => import('./Therapists'), 'admin')).toContain('<table')
  })
})

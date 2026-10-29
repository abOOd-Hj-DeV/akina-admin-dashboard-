import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { homeFor, ROLE_LABELS } from '../auth/permissions'
import { API_MOCK } from '../api/client'
import { resendLogin2faApi } from '../api/auth'
import type { Role } from '../types'
import Icon from '../components/Icon'

const ROLES: { role: Role; desc: string }[] = [
  { role: 'super_admin', desc: 'وصول كامل لكل الأقسام' },
  { role: 'admin', desc: 'تشغيل + مالية جزئية — بدون سريري' },
  { role: 'clinical_supervisor', desc: 'سريري + تنبيهات — بدون مال وهوية' },
  { role: 'finance_partner', desc: 'حوالاته وأرباحه فقط' },
  { role: 'support_agent', desc: 'حسابات + تذاكر — بدون علاج ومال' },
  { role: 'content_manager', desc: 'الأسئلة الشائعة فقط' },
]

export default function Login() {
  const { login, apiLogin, apiVerify2fa } = useAuth()
  const nav = useNavigate()
  const [wa, setWa] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [info, setInfo] = useState('')

  const enter = (r: Role) => {
    login(r)
    nav(`/${homeFor(r)}`, { replace: true })
  }

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true)
    setErr('')
    setInfo('')
    try {
      await fn()
    } catch (e) {
      setErr(e instanceof Error ? e.message : fallback)
    } finally {
      setBusy(false)
    }
  }

  const submit = () => run(async () => {
    const r = await apiLogin(wa, pw)
    if (r === '2fa') {
      setOtp('')
      setOtpStep(true)
      setInfo('أرسلنا رمز تحقق من 6 أرقام إلى واتساب هذا الرقم.')
      return
    }
    nav(`/${homeFor(r)}`, { replace: true })
  }, 'فشل تسجيل الدخول')

  const verify = () => run(async () => {
    const r = await apiVerify2fa(wa, otp)
    nav(`/${homeFor(r)}`, { replace: true })
  }, 'رمز التحقق غير صحيح')

  const resend = () => run(async () => {
    await resendLogin2faApi(wa)
    setInfo('إذا كان طلب الدخول ما زال قائماً، أُرسل رمز جديد.')
  }, 'تعذّر إعادة الإرسال')

  return (
    <div className="auth-page">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur-md">
        <div className="mb-1 flex items-center gap-3">
          <span className="brand-symbol brand-symbol-lg">
            <img src="/assets/auth-imgRectangle6.png" alt="" aria-hidden />
          </span>
          <div>
            <h1 className="font-['IBM_Plex_Sans_Arabic'] text-[24px] font-semibold text-[#0a0a0a]">لوحة إدارة سكينة</h1>
            <p className="text-[12px] text-[#657381]">Mental Health Therapy Platform</p>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-[#c7e4e7]/50 px-4 py-2.5 text-[12px] font-medium text-[#135e66]">
          <Icon name="lock" size={14} className="ms-1 inline" /> منطقة مقيدة — جميع محاولات الدخول مسجلة وتخضع للمراجعة (رمز تحقق عبر واتساب)
        </p>
        {otpStep ? (
          <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); void verify() }}>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-xl border border-[#ebebeb] px-4 py-3 text-center text-[18px] tracking-[0.5em] outline-none focus:border-[#1d919e]"
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="رمز التحقق"
              dir="ltr"
            />
            {info && <p className="rounded-xl bg-[#c7e4e7]/50 px-4 py-2 text-[12px] font-medium text-[#135e66]">{info}</p>}
            {err && <p className="rounded-xl bg-red-50 px-4 py-2 text-[12px] font-medium text-[#fd4438]">{err}</p>}
            <button
              type="submit"
              disabled={busy || otp.length !== 6}
              className="teal-button w-full"
            >
              {busy ? 'جارٍ التحقق…' : 'تأكيد الرمز'}
            </button>
            <div className="flex items-center justify-between text-[12px]">
              <button type="button" disabled={busy} onClick={() => void resend()} className="font-medium text-[#1d919e] disabled:opacity-50">إعادة إرسال الرمز</button>
              <button type="button" onClick={() => { setOtpStep(false); setErr(''); setInfo('') }} className="text-[#657381]">رجوع</button>
            </div>
          </form>
        ) : (
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => { e.preventDefault(); if (API_MOCK) return; void submit() }}
          >
            <input
              value={wa}
              onChange={(e) => setWa(e.target.value)}
              className="w-full rounded-xl border border-[#ebebeb] px-4 py-3 text-[14px] outline-none focus:border-[#1d919e]"
              placeholder={API_MOCK ? 'رقم الواتساب الإداري (مثال: +963900000777)' : 'رقم الواتساب الإداري'}
              dir="ltr"
            />
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full rounded-xl border border-[#ebebeb] px-4 py-3 text-[14px] outline-none focus:border-[#1d919e]"
              placeholder="كلمة المرور"
              dir="ltr"
            />
            {err && <p className="rounded-xl bg-red-50 px-4 py-2 text-[12px] font-medium text-[#fd4438]">{err}</p>}
            {!API_MOCK && (
              <button
                type="submit"
                disabled={busy || !wa || !pw}
                className="teal-button w-full"
              >
                {busy ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
              </button>
            )}
          </form>
        )}
        <div className="mt-4 flex items-center justify-between text-[12px]">
          <label className="flex items-center gap-1.5 text-[#657381]"><input type="checkbox" /> تذكرني</label>
          {!API_MOCK && <Link to="/activate" className="font-medium text-[#1d919e]">تفعيل حساب جديد</Link>}
          <span className="cursor-pointer font-medium text-[#1d919e]">استعادة كلمة المرور</span>
        </div>
        {API_MOCK && (
          <>
            <p className="mt-5 text-center text-[12px] font-medium text-[#657381]">الدخول التجريبي حسب الدور:</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.role}
                  onClick={() => enter(r.role)}
                  className="rounded-xl border border-[#1d919e]/25 px-3 py-3 text-right transition hover:border-[#1d919e] hover:bg-[#c7e4e7]/30"
                >
                  <div className="text-[14px] font-bold text-[#135e66]">{ROLE_LABELS[r.role]}</div>
                  <div className="mt-0.5 text-[12px] font-normal text-[#657381]">{r.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

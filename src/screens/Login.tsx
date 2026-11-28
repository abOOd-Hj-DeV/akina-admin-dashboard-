import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import type { CountryCode } from 'libphonenumber-js/min'
import { useAuth } from '../auth/AuthContext'
import { homeFor, ROLE_LABELS } from '../auth/permissions'
import { API_MOCK } from '../api/client'
import { describeAuthError } from '../api/errors'
import { DEFAULT_COUNTRY, PHONE_INVALID_MSG, toE164 } from '../lib/phone'
import { useCountdown } from '../hooks/useCountdown'
import { useFieldErrors } from '../hooks/useFieldErrors'
import type { Role } from '../types'
import Icon from '../components/Icon'
import PhoneInput, { FieldError } from '../components/PhoneInput'
import SessionRecovery from '../components/SessionRecovery'

const ROLES: { role: Role; desc: string }[] = [
  { role: 'super_admin', desc: 'وصول كامل لكل الأقسام' },
  { role: 'admin', desc: 'تشغيل + مالية جزئية — بدون سريري' },
  { role: 'clinical_supervisor', desc: 'سريري + تنبيهات — بدون مال وهوية' },
  { role: 'finance_partner', desc: 'حوالاته وأرباحه فقط' },
  { role: 'support_agent', desc: 'حسابات + تذاكر — بدون علاج ومال' },
  { role: 'content_manager', desc: 'الأسئلة الشائعة فقط' },
]

type Field = 'whatsapp_number' | 'password' | 'otp'
const field = 'w-full rounded-xl border px-4 py-3 text-[14px] outline-none focus:border-[#1d919e]'

export default function Login() {
  const { role, ready, login, apiLogin, apiVerify2fa, apiResend2fa } = useAuth()
  const nav = useNavigate()
  const [wa, setWa] = useState('')
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY)
  const [e164, setE164] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [info, setInfo] = useState('')
  const { errors, set, clear, reset } = useFieldErrors<Field>()
  const [cooldown, startCooldown] = useCountdown()

  const enter = (r: Role) => {
    login(r)
    nav(`/${homeFor(r)}`, { replace: true })
  }

  const backToStart = (msg: string) => {
    setOtpStep(false)
    setOtp('')
    setInfo('')
    reset()
    set('form', msg)
  }

  const fail = (e: unknown, fallback: string) => {
    const d = describeAuthError(e, fallback)
    if (d.code === 'otp_exhausted' || d.field === 'login_challenge') return backToStart(d.message)
    if (d.code === 'otp_cooldown' && d.retryAfter) startCooldown(d.retryAfter)
    const f = d.field === 'whatsapp_number' || d.field === 'password' || d.field === 'otp' ? d.field : 'form'
    set(otpStep && f !== 'otp' ? 'form' : f, d.message)
  }

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true)
    setInfo('')
    try {
      await fn()
    } catch (e) {
      fail(e, fallback)
    } finally {
      setBusy(false)
    }
  }

  const submit = () => {
    reset()
    const num = toE164(wa, country)
    let ok = true
    if (!num) { set('whatsapp_number', PHONE_INVALID_MSG); ok = false }
    if (!pw) { set('password', 'أدخل كلمة المرور.'); ok = false }
    if (!ok || !num) return
    setE164(num)
    void run(async () => {
      const r = await apiLogin(num, pw)
      if (r === '2fa') {
        setOtp('')
        setOtpStep(true)
        setInfo('أرسلنا رمز تحقق من 6 أرقام إلى واتساب هذا الرقم.')
        return
      }
      nav(`/${homeFor(r)}`, { replace: true })
    }, 'فشل تسجيل الدخول')
  }

  const verify = () => {
    reset()
    if (otp.length !== 6) { set('otp', 'أدخل الرمز المكوّن من 6 أرقام.'); return }
    void run(async () => {
      const r = await apiVerify2fa(e164, otp)
      nav(`/${homeFor(r)}`, { replace: true })
    }, 'رمز التحقق غير صحيح')
  }

  const resend = () => {
    reset()
    void run(async () => {
      await apiResend2fa(e164)
      setOtp('')
      setInfo('إذا كان طلب الدخول ما زال قائماً، أُرسل رمز جديد.')
    }, 'تعذّر إعادة الإرسال')
  }

  if (!ready) return <SessionRecovery />
  if (role && !API_MOCK) return <Navigate to={`/${homeFor(role)}`} replace />

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
          <form className="mt-6 space-y-3" noValidate onSubmit={(e) => { e.preventDefault(); verify() }}>
            <div>
              <input
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); clear('otp') }}
                className={`${field} text-center text-[18px] tracking-[0.5em] ${errors.otp ? 'border-[#fd4438]' : 'border-[#ebebeb]'}`}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="رمز التحقق"
                aria-invalid={errors.otp ? true : undefined}
                dir="ltr"
              />
              <FieldError>{errors.otp}</FieldError>
            </div>
            {info && <p className="rounded-xl bg-[#c7e4e7]/50 px-4 py-2 text-[12px] font-medium text-[#135e66]">{info}</p>}
            {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-[12px] font-medium text-[#fd4438]">{errors.form}</p>}
            <button type="submit" disabled={busy} className="teal-button w-full">
              {busy ? 'جارٍ التحقق…' : 'تأكيد الرمز'}
            </button>
            <div className="flex items-center justify-between text-[12px]">
              <button type="button" disabled={busy || cooldown > 0} onClick={resend} className="font-medium text-[#1d919e] disabled:opacity-50">
                {cooldown > 0 ? `إعادة إرسال الرمز (${cooldown})` : 'إعادة إرسال الرمز'}
              </button>
              <button type="button" onClick={() => { setOtpStep(false); reset(); setInfo('') }} className="text-[#657381]">رجوع</button>
            </div>
          </form>
        ) : (
          <form
            className="mt-6 space-y-3"
            noValidate
            onSubmit={(e) => { e.preventDefault(); if (API_MOCK) return; submit() }}
          >
            <PhoneInput
              value={wa}
              country={country}
              onChange={(v) => { setWa(v); clear('whatsapp_number'); clear('form') }}
              onCountryChange={(c) => { setCountry(c); clear('whatsapp_number') }}
              error={errors.whatsapp_number}
              label="رقم الواتساب الإداري"
            />
            <div>
              <input
                type="password"
                value={pw}
                onChange={(e) => { setPw(e.target.value); clear('password'); clear('form') }}
                className={`${field} ${errors.password ? 'border-[#fd4438]' : 'border-[#ebebeb]'}`}
                placeholder="كلمة المرور"
                aria-label="كلمة المرور"
                autoComplete="current-password"
                dir="ltr"
              />
              <FieldError>{errors.password}</FieldError>
            </div>
            {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-[12px] font-medium text-[#fd4438]">{errors.form}</p>}
            {!API_MOCK && (
              <button type="submit" disabled={busy} className="teal-button w-full">
                {busy ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
              </button>
            )}
          </form>
        )}
        <div className="mt-4 flex items-center justify-between text-[12px]">
          <label className="flex items-center gap-1.5 text-[#657381]"><input type="checkbox" /> تذكرني</label>
          {!API_MOCK && <Link to="/activate" className="font-medium text-[#1d919e]">تفعيل حساب جديد</Link>}
          {!API_MOCK && <Link to="/forgot-password" className="font-medium text-[#1d919e]">استعادة كلمة المرور</Link>}
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

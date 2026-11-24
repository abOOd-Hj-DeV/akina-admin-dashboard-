import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CountryCode } from 'libphonenumber-js/min'
import { activateApi } from '../api/auth'
import { describeAuthError } from '../api/errors'
import { DEFAULT_COUNTRY, PHONE_INVALID_MSG, toE164 } from '../lib/phone'
import { PASSWORD_MISMATCH_MSG, passwordError } from '../lib/password'
import { useFieldErrors } from '../hooks/useFieldErrors'
import PhoneInput, { FieldError } from '../components/PhoneInput'

type Field = 'whatsapp_number' | 'code' | 'password' | 'password_confirmation'
const box = 'w-full rounded-xl border px-4 py-3 text-[14px] outline-none focus:border-[#1d919e]'
const tone = (bad?: string) => (bad ? 'border-[#fd4438]' : 'border-[#ebebeb]')

/** تفعيل حساب إداري جديد: رمز الدعوة (8 خانات) المرسل عبر واتساب + تعيين كلمة المرور */
export default function Activate() {
  const [wa, setWa] = useState('')
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY)
  const [code, setCode] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const { errors, set, clear, reset } = useFieldErrors<Field>()

  const submit = async () => {
    reset()
    const num = toE164(wa, country)
    let ok = true
    if (!num) { set('whatsapp_number', PHONE_INVALID_MSG); ok = false }
    if (code.length !== 8) { set('code', 'رمز التفعيل مكوّن من 8 خانات.'); ok = false }
    const pe = passwordError(pw)
    if (pe) { set('password', pe); ok = false }
    if (pw !== pw2) { set('password_confirmation', PASSWORD_MISMATCH_MSG); ok = false }
    if (!ok || !num) return
    setBusy(true)
    try {
      await activateApi(num, code, pw, pw2)
      setDone(true)
    } catch (e) {
      const d = describeAuthError(e, 'تعذّر تفعيل الحساب')
      // رمز التفعيل يُعامل كـOTP: أكواد otp_* تظهر تحت حقل الرمز
      const f = d.field === 'otp' ? 'code' : d.field
      if (d.code === 'otp_exhausted') setCode('')
      const known: Field[] = ['whatsapp_number', 'code', 'password', 'password_confirmation']
      set(known.includes(f as Field) ? (f as Field) : 'form', d.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur-md">
        <h1 className="text-[24px] font-bold text-[#0a0a0a]">تفعيل حساب الإدارة</h1>
        <p className="mt-1 text-[12px] text-[#657381]">أدخل رمز التفعيل المرسل إلى واتساب، ثم اختر كلمة المرور.</p>
        {done ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl bg-[#c7e4e7]/50 px-4 py-3 text-[14px] font-medium text-[#135e66]">تم تفعيل الحساب. يمكنك الآن تسجيل الدخول.</p>
            <Link to="/login" className="teal-button w-full no-underline">تسجيل الدخول</Link>
          </div>
        ) : (
          <form className="mt-6 space-y-3" noValidate onSubmit={(e) => { e.preventDefault(); void submit() }}>
            <PhoneInput
              value={wa}
              country={country}
              onChange={(v) => { setWa(v); clear('whatsapp_number') }}
              onCountryChange={(c) => { setCountry(c); clear('whatsapp_number') }}
              error={errors.whatsapp_number}
            />
            <div>
              <input
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)); clear('code') }}
                className={`${box} text-center tracking-[0.3em] ${tone(errors.code)}`}
                placeholder="رمز التفعيل (8 خانات)"
                aria-label="رمز التفعيل"
                autoComplete="one-time-code"
                dir="ltr"
              />
              <FieldError>{errors.code}</FieldError>
            </div>
            <div>
              <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); clear('password') }} className={`${box} ${tone(errors.password)}`}
                placeholder="كلمة المرور (8 أحرف على الأقل، حرف ورقم)" aria-label="كلمة المرور" autoComplete="new-password" dir="ltr" />
              <FieldError>{errors.password}</FieldError>
            </div>
            <div>
              <input type="password" value={pw2} onChange={(e) => { setPw2(e.target.value); clear('password_confirmation') }} className={`${box} ${tone(errors.password_confirmation)}`}
                placeholder="تأكيد كلمة المرور" aria-label="تأكيد كلمة المرور" autoComplete="new-password" dir="ltr" />
              <FieldError>{errors.password_confirmation}</FieldError>
            </div>
            {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-[12px] font-medium text-[#fd4438]">{errors.form}</p>}
            <button type="submit" disabled={busy} className="teal-button w-full">
              {busy ? 'جارٍ التفعيل…' : 'تفعيل الحساب'}
            </button>
            <Link to="/login" className="block text-center text-[12px] text-[#657381]">العودة لتسجيل الدخول</Link>
          </form>
        )}
      </div>
    </div>
  )
}

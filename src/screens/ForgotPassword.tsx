import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CountryCode } from 'libphonenumber-js/min'
import { forgotPasswordApi, resetPasswordApi } from '../api/auth'
import { describeAuthError } from '../api/errors'
import { DEFAULT_COUNTRY, PHONE_INVALID_MSG, toE164 } from '../lib/phone'
import { PASSWORD_MISMATCH_MSG, passwordError } from '../lib/password'
import { useCountdown } from '../hooks/useCountdown'
import { useFieldErrors } from '../hooks/useFieldErrors'
import PhoneInput, { FieldError } from '../components/PhoneInput'

type Field = 'whatsapp_number' | 'otp' | 'password' | 'password_confirmation'
const box = 'w-full rounded-xl border px-4 py-3 text-[14px] outline-none focus:border-[#1d919e]'
const tone = (bad?: string) => (bad ? 'border-[#fd4438]' : 'border-[#ebebeb]')

/** استعادة كلمة المرور: رقم واتساب → رمز عبر واتساب → كلمة مرور جديدة */
export default function ForgotPassword() {
  const [step, setStep] = useState<'phone' | 'reset' | 'done'>('phone')
  const [wa, setWa] = useState('')
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY)
  const [e164, setE164] = useState('')
  const [otp, setOtp] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState('')
  const { errors, set, clear, reset } = useFieldErrors<Field>()
  const [cooldown, startCooldown] = useCountdown()

  const fail = (e: unknown, fallback: string) => {
    const d = describeAuthError(e, fallback)
    if (d.code === 'otp_cooldown' && d.retryAfter) startCooldown(d.retryAfter)
    if (d.code === 'otp_exhausted' || (step === 'reset' && d.field === 'whatsapp_number')) {
      setStep('phone'); setOtp(''); setPw(''); setPw2(''); setInfo('')
      set(d.field === 'whatsapp_number' ? 'whatsapp_number' : 'form', d.message)
      return
    }
    const known: Field[] = ['whatsapp_number', 'otp', 'password', 'password_confirmation']
    set(known.includes(d.field as Field) ? (d.field as Field) : 'form', d.message)
  }

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true)
    try { await fn() } catch (e) { fail(e, fallback) } finally { setBusy(false) }
  }

  const sendCode = (num: string) => run(async () => {
    const res = await forgotPasswordApi(num)
    setE164(num)
    setStep('reset')
    setInfo(res.message || 'إذا كان الرقم مسجلاً، أرسلنا رمز الاستعادة عبر واتساب.')
  }, 'تعذّر إرسال الرمز')

  const requestCode = () => {
    reset()
    const num = toE164(wa, country)
    if (!num) { set('whatsapp_number', PHONE_INVALID_MSG); return }
    void sendCode(num)
  }

  const resend = () => {
    reset()
    setOtp('')
    void sendCode(e164)
  }

  const submit = () => {
    reset()
    let ok = true
    if (!/^\d{6}$/.test(otp)) { set('otp', 'أدخل الرمز المكوّن من 6 أرقام.'); ok = false }
    const pe = passwordError(pw)
    if (pe) { set('password', pe); ok = false }
    if (pw !== pw2) { set('password_confirmation', PASSWORD_MISMATCH_MSG); ok = false }
    if (!ok) return
    void run(async () => {
      await resetPasswordApi(e164, otp, pw, pw2)
      setStep('done')
    }, 'تعذّر تغيير كلمة المرور')
  }

  return (
    <div className="auth-page">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur-md">
        <h1 className="text-[24px] font-bold text-[#0a0a0a]">استعادة كلمة المرور</h1>
        <p className="mt-1 text-[12px] text-[#657381]">نرسل رمزاً من 6 أرقام إلى واتساب الرقم المسجّل، ثم تختار كلمة مرور جديدة.</p>
        {step === 'done' && (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl bg-[#c7e4e7]/50 px-4 py-3 text-[14px] font-medium text-[#135e66]">تم تغيير كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.</p>
            <Link to="/login" className="teal-button w-full no-underline">تسجيل الدخول</Link>
          </div>
        )}
        {step === 'phone' && (
          <form className="mt-6 space-y-3" noValidate onSubmit={(e) => { e.preventDefault(); requestCode() }}>
            <PhoneInput
              value={wa}
              country={country}
              onChange={(v) => { setWa(v); clear('whatsapp_number'); clear('form') }}
              onCountryChange={(c) => { setCountry(c); clear('whatsapp_number') }}
              error={errors.whatsapp_number}
            />
            {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-[12px] font-medium text-[#fd4438]">{errors.form}</p>}
            <button type="submit" disabled={busy} className="teal-button w-full">{busy ? 'جارٍ الإرسال…' : 'إرسال الرمز'}</button>
            <Link to="/login" className="block text-center text-[12px] text-[#657381]">العودة لتسجيل الدخول</Link>
          </form>
        )}
        {step === 'reset' && (
          <form className="mt-6 space-y-3" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
            {info && <p className="rounded-xl bg-[#c7e4e7]/50 px-4 py-2 text-[12px] font-medium text-[#135e66]">{info}</p>}
            <div>
              <input
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); clear('otp') }}
                className={`${box} text-center text-[18px] tracking-[0.5em] ${tone(errors.otp)}`}
                placeholder="000000" inputMode="numeric" autoComplete="one-time-code" aria-label="رمز الاستعادة" dir="ltr"
              />
              <FieldError>{errors.otp}</FieldError>
            </div>
            <div>
              <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); clear('password') }}
                className={`${box} ${tone(errors.password)}`} placeholder="كلمة المرور الجديدة" aria-label="كلمة المرور الجديدة" autoComplete="new-password" dir="ltr" />
              <FieldError>{errors.password}</FieldError>
            </div>
            <div>
              <input type="password" value={pw2} onChange={(e) => { setPw2(e.target.value); clear('password_confirmation') }}
                className={`${box} ${tone(errors.password_confirmation)}`} placeholder="تأكيد كلمة المرور" aria-label="تأكيد كلمة المرور" autoComplete="new-password" dir="ltr" />
              <FieldError>{errors.password_confirmation}</FieldError>
            </div>
            {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-[12px] font-medium text-[#fd4438]">{errors.form}</p>}
            <button type="submit" disabled={busy} className="teal-button w-full">{busy ? 'جارٍ الحفظ…' : 'تغيير كلمة المرور'}</button>
            <div className="flex items-center justify-between text-[12px]">
              <button type="button" disabled={busy || cooldown > 0} onClick={resend} className="font-medium text-[#1d919e] disabled:opacity-50">
                {cooldown > 0 ? `إعادة إرسال الرمز (${cooldown})` : 'إعادة إرسال الرمز'}
              </button>
              <button type="button" onClick={() => { setStep('phone'); reset(); setInfo('') }} className="text-[#657381]">تغيير الرقم</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

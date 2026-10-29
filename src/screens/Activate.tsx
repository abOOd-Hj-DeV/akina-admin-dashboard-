import { useState } from 'react'
import { Link } from 'react-router-dom'
import { activateApi } from '../api/auth'
import { ApiError } from '../api/client'

const field = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-[#1d919e]'

/** تفعيل حساب إداري جديد: رمز الدعوة (8 خانات) المرسل عبر واتساب + تعيين كلمة المرور */
export default function Activate() {
  const [wa, setWa] = useState('')
  const [code, setCode] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const mismatch = pw2 !== '' && pw !== pw2
  const canSubmit = !busy && wa !== '' && code.length === 8 && pw.length >= 8 && pw === pw2

  const submit = async () => {
    setBusy(true)
    setErr('')
    try {
      await activateApi(wa, code, pw, pw2)
      setDone(true)
    } catch (e) {
      const first = e instanceof ApiError && e.errors ? Object.values(e.errors)[0]?.[0] : undefined
      setErr(first ?? (e instanceof Error ? e.message : 'تعذّر تفعيل الحساب'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-gradient flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-[24px] font-bold text-[#1f1f21]">تفعيل حساب الإدارة</h1>
        <p className="mt-1 text-[12px] text-[#6b7280]">أدخل رمز التفعيل المرسل إلى واتساب، ثم اختر كلمة المرور.</p>
        {done ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl bg-[#c7e4e7]/50 px-4 py-3 text-[14px] font-medium text-[#1d656e]">تم تفعيل الحساب. يمكنك الآن تسجيل الدخول.</p>
            <Link to="/login" className="block w-full rounded-xl bg-[#1d919e] py-3 text-center text-[14px] font-bold text-white">تسجيل الدخول</Link>
          </div>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); void submit() }}>
            <input value={wa} onChange={(e) => setWa(e.target.value)} className={field} placeholder="رقم الواتساب" aria-label="رقم الواتساب" dir="ltr" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8))}
              className={`${field} text-center tracking-[0.3em]`}
              placeholder="رمز التفعيل (8 خانات)"
              aria-label="رمز التفعيل"
              autoComplete="one-time-code"
              dir="ltr"
            />
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className={field} placeholder="كلمة المرور (8 أحرف على الأقل)" aria-label="كلمة المرور" autoComplete="new-password" dir="ltr" />
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={field} placeholder="تأكيد كلمة المرور" aria-label="تأكيد كلمة المرور" autoComplete="new-password" dir="ltr" />
            {mismatch && <p className="text-[12px] font-medium text-[#fd4438]">كلمتا المرور غير متطابقتين</p>}
            {err && <p className="rounded-xl bg-red-50 px-4 py-2 text-[12px] font-medium text-[#fd4438]">{err}</p>}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-[#1d919e] py-3 text-[14px] font-bold text-white transition hover:bg-[#187a85] disabled:opacity-50"
            >
              {busy ? 'جارٍ التفعيل…' : 'تفعيل الحساب'}
            </button>
            <Link to="/login" className="block text-center text-[12px] text-[#6b7280]">العودة لتسجيل الدخول</Link>
          </form>
        )}
      </div>
    </div>
  )
}

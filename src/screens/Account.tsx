import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { API_MOCK } from '../api/client'
import { changePasswordApi } from '../api/auth'
import { describeAuthError } from '../api/errors'
import { PASSWORD_MISMATCH_MSG, passwordError } from '../lib/password'
import { useFieldErrors } from '../hooks/useFieldErrors'
import { Btn, Card, PageHeader } from '../components/ui'
import { FieldError } from '../components/PhoneInput'

type Field = 'current_password' | 'password' | 'password_confirmation'
const box = 'w-full rounded-xl border px-4 py-2.5 text-[14px] outline-none focus:border-[#1d919e]'
const tone = (bad?: string) => (bad ? 'border-[#fd4438]' : 'border-[#ebebeb]')

/** حسابي: تغيير كلمة المرور + تسجيل الخروج من كل الأجهزة (متاح لكل أدوار الإدارة) */
export default function Account() {
  const { logoutAll } = useAuth()
  const nav = useNavigate()
  const [current, setCurrent] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const { errors, set, clear, reset } = useFieldErrors<Field>()
  const [allErr, setAllErr] = useState('')
  const [allBusy, setAllBusy] = useState(false)

  const change = async () => {
    reset(); setDone('')
    let ok = true
    if (!current) { set('current_password', 'أدخل كلمة المرور الحالية.'); ok = false }
    const pe = passwordError(pw)
    if (pe) { set('password', pe); ok = false }
    if (pw !== pw2) { set('password_confirmation', PASSWORD_MISMATCH_MSG); ok = false }
    if (!ok) return
    setBusy(true)
    try {
      if (!API_MOCK) await changePasswordApi(current, pw, pw2)
      setCurrent(''); setPw(''); setPw2('')
      setDone('تم تغيير كلمة المرور، وأُنهيت الجلسات على الأجهزة الأخرى.')
    } catch (e) {
      const d = describeAuthError(e, 'تعذّر تغيير كلمة المرور.')
      const known: Field[] = ['current_password', 'password', 'password_confirmation']
      set(known.includes(d.field as Field) ? (d.field as Field) : 'form', d.message)
    } finally {
      setBusy(false)
    }
  }

  const signOutAll = async () => {
    if (!window.confirm('سيتم تسجيل خروجك من كل الأجهزة، بما فيها هذا الجهاز. متابعة؟')) return
    setAllErr(''); setAllBusy(true)
    try {
      await logoutAll()
      nav('/login', { replace: true })
    } catch (e) {
      setAllErr(describeAuthError(e, 'تعذّر تسجيل الخروج من كل الأجهزة.').message)
    } finally {
      setAllBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="حسابي" sub="أمان حسابك — كلمة المرور والجلسات" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-[16px] font-bold text-[#0a0a0a]">تغيير كلمة المرور</h3>
          <form className="space-y-3" noValidate onSubmit={(e) => { e.preventDefault(); void change() }}>
            <div>
              <input type="password" value={current} onChange={(e) => { setCurrent(e.target.value); clear('current_password') }}
                className={`${box} ${tone(errors.current_password)}`} placeholder="كلمة المرور الحالية" aria-label="كلمة المرور الحالية" autoComplete="current-password" dir="ltr" />
              <FieldError>{errors.current_password}</FieldError>
            </div>
            <div>
              <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); clear('password') }}
                className={`${box} ${tone(errors.password)}`} placeholder="كلمة المرور الجديدة" aria-label="كلمة المرور الجديدة" autoComplete="new-password" dir="ltr" />
              <FieldError>{errors.password}</FieldError>
            </div>
            <div>
              <input type="password" value={pw2} onChange={(e) => { setPw2(e.target.value); clear('password_confirmation') }}
                className={`${box} ${tone(errors.password_confirmation)}`} placeholder="تأكيد كلمة المرور الجديدة" aria-label="تأكيد كلمة المرور الجديدة" autoComplete="new-password" dir="ltr" />
              <FieldError>{errors.password_confirmation}</FieldError>
            </div>
            {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-[12px] font-medium text-[#fd4438]">{errors.form}</p>}
            {done && <p className="rounded-xl bg-[#c7e4e7]/50 px-4 py-2 text-[12px] font-medium text-[#135e66]">{done}</p>}
            <button type="submit" disabled={busy} className="teal-button">{busy ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}</button>
          </form>
        </Card>
        <Card>
          <h3 className="mb-2 text-[16px] font-bold text-[#0a0a0a]">الجلسات</h3>
          <p className="mb-4 text-[14px] text-[#657381]">إن فقدت جهازاً أو شككت بدخول غير مصرّح، أنهِ كل الجلسات النشطة على كل الأجهزة.</p>
          {allErr && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-[12px] font-medium text-[#fd4438]">{allErr}</p>}
          <Btn tone="danger-soft" disabled={allBusy || API_MOCK} onClick={() => void signOutAll()}>تسجيل الخروج من كل الأجهزة</Btn>
        </Card>
      </div>
    </>
  )
}

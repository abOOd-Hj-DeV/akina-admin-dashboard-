import { useState } from 'react'
import type { CountryCode } from 'libphonenumber-js/min'
import { ApiError } from '../api/client'
import { describeAuthError } from '../api/errors'
import type { ApiRole } from '../api/types'
import { ROLE_LABELS } from '../auth/permissions'
import type { Role } from '../types'
import { DEFAULT_COUNTRY } from '../lib/phone'
import { buildInvite, mapInviteErrors, type InviteField as Field } from '../lib/invite'
import { useFieldErrors } from '../hooks/useFieldErrors'
import { inviteUser } from '../services/data'
import { Btn, Card } from './ui'
import PhoneInput, { FieldError } from './PhoneInput'

const box = 'w-full rounded-xl border px-4 py-2.5 text-[14px] outline-none focus:border-[#1d919e]'
const tone = (bad?: string) => (bad ? 'border-[#fd4438]' : 'border-[#ebebeb]')

/** نموذج دعوة عبر واتساب — يُستخدم لفريق الإدارة (Users) وللمعالجين (Therapists) */
export default function InviteUserForm({ roles, disabled = false, onDone, onCancel }: {
  roles: ApiRole[]
  disabled?: boolean
  onDone: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [wa, setWa] = useState('')
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY)
  const [role, setRole] = useState<ApiRole>(roles[0])
  const [applicationRef, setApplicationRef] = useState('')
  const [busy, setBusy] = useState(false)
  const { errors, clear, reset, replace } = useFieldErrors<Field>()
  const isTherapist = role === 'therapist'

  const submit = async () => {
    if (busy || disabled) return
    reset()
    const { body, errors: local } = buildInvite({ name, email, whatsapp: wa, country, role, applicationRef })
    if (!body) { replace(local); return }
    setBusy(true)
    try {
      await inviteUser(body)
      onDone()
    } catch (e) {
      if (e instanceof ApiError && e.status === 503 && e.code === 'whatsapp_check_unavailable') {
        replace({ form: 'خدمة التحقق من رقم واتساب غير متاحة مؤقتًا. حاول إرسال الدعوة مرة أخرى بعد قليل.' })
        return
      }
      const d = describeAuthError(e, 'تعذّر إرسال الدعوة.')
      replace(mapInviteErrors(d.fieldErrors ?? {}, d.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mb-4">
      <form className="space-y-3" noValidate onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <input value={name} onChange={(e) => { setName(e.target.value); clear('name') }} placeholder="الاسم" aria-label="الاسم" className={`${box} ${tone(errors.name)}`} />
            <FieldError>{errors.name}</FieldError>
          </div>
          {!isTherapist && <div>
            <input value={email} onChange={(e) => { setEmail(e.target.value); clear('email') }} placeholder="البريد الإلكتروني" aria-label="البريد الإلكتروني" dir="ltr" className={`${box} ${tone(errors.email)}`} />
            <FieldError>{errors.email}</FieldError>
          </div>}
          <PhoneInput
            id="invite-whatsapp"
            value={wa}
            country={country}
            onChange={(v) => { setWa(v); clear('whatsapp_number') }}
            onCountryChange={(c) => { setCountry(c); clear('whatsapp_number') }}
            error={errors.whatsapp_number}
          />
          {roles.length > 1 ? (
            <div>
              <select value={role} onChange={(e) => { setRole(e.target.value as ApiRole); clear('role') }} aria-label="الدور" className={`${box} ${tone(errors.role)}`}>
                {roles.map((x) => <option key={x} value={x}>{x in ROLE_LABELS ? ROLE_LABELS[x as Role] : x}</option>)}
              </select>
              <FieldError>{errors.role}</FieldError>
            </div>
          ) : null}
          {isTherapist && (
            <div>
              <label className="text-sm">
                رقم طلب التقديم
                <input value={applicationRef} onChange={(e) => { setApplicationRef(e.target.value); clear('therapist.application_ref') }}
                  dir="ltr" autoCapitalize="characters" spellCheck={false} required
                  aria-invalid={!!errors['therapist.application_ref']} aria-describedby="invite-application-ref-error"
                  className={`${box} ${tone(errors['therapist.application_ref'])}`} />
              </label>
              <FieldError id="invite-application-ref-error">{errors['therapist.application_ref']}</FieldError>
            </div>
          )}
        </div>
        {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-[12px] font-medium text-[#fd4438]">{errors.form}</p>}
        <div className="flex gap-2">
          <Btn tone="green" type="submit" disabled={busy || disabled}>{busy ? 'جارٍ الإرسال…' : 'إرسال الدعوة'}</Btn>
          <Btn tone="ghost" type="button" onClick={onCancel}>إلغاء</Btn>
        </div>
      </form>
    </Card>
  )
}

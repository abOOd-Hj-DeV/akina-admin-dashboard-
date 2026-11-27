import { useState } from 'react'
import type { CountryCode } from 'libphonenumber-js/min'
import { describeAuthError } from '../api/errors'
import type { ApiRole } from '../api/types'
import { ROLE_LABELS } from '../auth/permissions'
import type { Role } from '../types'
import { DEFAULT_COUNTRY } from '../lib/phone'
import { buildInvite, mapInviteErrors, type InviteField as Field } from '../lib/invite'
import { useFieldErrors } from '../hooks/useFieldErrors'
import { useAsync } from '../hooks/useAsync'
import { getTherapistOptions, inviteUser } from '../services/data'
import { Btn, Card } from './ui'
import PhoneInput, { FieldError } from './PhoneInput'

const box = 'w-full rounded-xl border px-4 py-2.5 text-[14px] outline-none focus:border-[#1d919e]'
const tone = (bad?: string) => (bad ? 'border-[#fd4438]' : 'border-[#ebebeb]')

/** نموذج دعوة عبر واتساب — يُستخدم لفريق الإدارة (Users) وللمعالجين (Therapists) */
export default function InviteUserForm({ roles, onDone, onCancel }: {
  roles: ApiRole[]
  onDone: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [wa, setWa] = useState('')
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY)
  const [role, setRole] = useState<ApiRole>(roles[0])
  const [specialty, setSpecialty] = useState('')
  const [tCountry, setTCountry] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const { errors, clear, reset, replace } = useFieldErrors<Field>()
  const isTherapist = role === 'therapist'
  const { data: options, loading: optionsLoading } = useAsync(
    () => isTherapist ? getTherapistOptions() : Promise.resolve(null),
    [isTherapist],
    { interval: 0 },
  )

  const submit = async () => {
    if (busy || (isTherapist && !options)) return
    reset()
    const { body, errors: local } = buildInvite({ name, email, whatsapp: wa, country, role, specialty, therapistCountry: tCountry, languages })
    if (!body) { replace(local); return }
    setBusy(true)
    try {
      await inviteUser(body)
      onDone()
    } catch (e) {
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
          <div>
            <input value={email} onChange={(e) => { setEmail(e.target.value); clear('email') }} placeholder="البريد الإلكتروني" aria-label="البريد الإلكتروني" dir="ltr" className={`${box} ${tone(errors.email)}`} />
            <FieldError>{errors.email}</FieldError>
          </div>
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
            <>
              <label className="text-sm">
                التخصص
                <select value={specialty} onChange={(e) => { setSpecialty(e.target.value); clear('therapist.specialty') }}
                  disabled={!options || busy} className={`${box} ${tone(errors['therapist.specialty'])}`}>
                  <option value="">اختر التخصص</option>
                  {options?.specialties.map(({ code, name_ar }) => <option key={code} value={code}>{name_ar}</option>)}
                </select>
                <FieldError>{errors['therapist.specialty']}</FieldError>
              </label>
              <label className="text-sm">
                الدولة
                <select value={tCountry} onChange={(e) => { setTCountry(e.target.value); clear('therapist.country') }}
                  disabled={!options || busy} className={`${box} ${tone(errors['therapist.country'])}`}>
                  <option value="">اختر الدولة</option>
                  {options?.countries.map(({ code, name_ar }) => <option key={code} value={code}>{name_ar}</option>)}
                </select>
                <FieldError>{errors['therapist.country']}</FieldError>
              </label>
              <label className="text-sm md:col-span-2">
                اللغات (اختياري، يمكنك اختيار أكثر من لغة)
                <select multiple value={languages} size={4} disabled={!options || busy}
                  onChange={(e) => { setLanguages(Array.from(e.currentTarget.selectedOptions, o => o.value)); clear('therapist.languages') }}
                  className={`${box} ${tone(errors['therapist.languages'])}`}>
                  {options?.languages.map(({ code, name_ar }) => <option key={code} value={code}>{name_ar}</option>)}
                </select>
                <FieldError>{errors['therapist.languages']}</FieldError>
              </label>
              {optionsLoading && <p role="status" className="text-sm text-[#657381]">جارٍ تحميل خيارات المعالج…</p>}
            </>
          )}
        </div>
        {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-[12px] font-medium text-[#fd4438]">{errors.form}</p>}
        <div className="flex gap-2">
          <Btn tone="green" type="submit" disabled={busy || (isTherapist && !options)}>{busy ? 'جارٍ الإرسال…' : 'إرسال الدعوة'}</Btn>
          <Btn tone="ghost" type="button" onClick={onCancel}>إلغاء</Btn>
        </div>
      </form>
    </Card>
  )
}

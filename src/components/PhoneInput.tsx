import type { CountryCode } from 'libphonenumber-js/min'
import { PHONE_COUNTRIES } from '../lib/phone'

const box = 'rounded-xl border px-4 py-3 text-[14px] outline-none focus:border-[#1d919e]'

/** حقل واتساب: اختيار الدولة (الافتراضي سوريا +963) + الرقم محلياً أو دولياً + خطأ تحت الحقل */
export default function PhoneInput({ value, country, onChange, onCountryChange, error, label = 'رقم الواتساب', placeholder, id = 'whatsapp' }: {
  value: string
  country: CountryCode
  onChange: (v: string) => void
  onCountryChange: (c: CountryCode) => void
  error?: string | null
  label?: string
  placeholder?: string
  id?: string
}) {
  const errId = `${id}-error`
  return (
    <div>
      <div className="flex gap-2" dir="ltr">
        <select
          value={country}
          onChange={(e) => onCountryChange(e.target.value as CountryCode)}
          aria-label="رمز الدولة"
          className={`${box} w-[120px] shrink-0 border-[#ebebeb] bg-white px-2`}
        >
          {PHONE_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.dial} {c.label}</option>)}
        </select>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? '09XXXXXXXX'}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          className={`${box} w-full min-w-0 ${error ? 'border-[#fd4438]' : 'border-[#ebebeb]'}`}
        />
      </div>
      {error && <p id={errId} role="alert" className="mt-1 text-[12px] font-medium text-[#fd4438]">{error}</p>}
    </div>
  )
}

export function FieldError({ id, children }: { id?: string; children?: string | null }) {
  if (!children) return null
  return <p id={id} role="alert" className="mt-1 text-[12px] font-medium text-[#fd4438]">{children}</p>
}

/** أرقام واتساب: تحويل الإدخال المحلي أو الدولي إلى E.164 قبل الإرسال (عقد §1) */
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min'

export const DEFAULT_COUNTRY: CountryCode = 'SY'

export const PHONE_COUNTRIES: { code: CountryCode; label: string; dial: string }[] = [
  { code: 'SY', label: 'سوريا', dial: '+963' },
  { code: 'LB', label: 'لبنان', dial: '+961' },
  { code: 'JO', label: 'الأردن', dial: '+962' },
  { code: 'IQ', label: 'العراق', dial: '+964' },
  { code: 'SA', label: 'السعودية', dial: '+966' },
  { code: 'AE', label: 'الإمارات', dial: '+971' },
  { code: 'QA', label: 'قطر', dial: '+974' },
  { code: 'KW', label: 'الكويت', dial: '+965' },
  { code: 'BH', label: 'البحرين', dial: '+973' },
  { code: 'OM', label: 'عُمان', dial: '+968' },
  { code: 'EG', label: 'مصر', dial: '+20' },
  { code: 'TR', label: 'تركيا', dial: '+90' },
  { code: 'DE', label: 'ألمانيا', dial: '+49' },
  { code: 'GB', label: 'المملكة المتحدة', dial: '+44' },
  { code: 'US', label: 'الولايات المتحدة', dial: '+1' },
]

export const PHONE_INVALID_MSG = 'رقم واتساب غير صحيح.'

/** يرجع الرقم بصيغة E.164 أو null إن كان غير صالح */
export function toE164(raw: string, country: CountryCode = DEFAULT_COUNTRY): string | null {
  const s = raw.trim().replace(/^00/, '+')
  if (!s) return null
  const parsed = parsePhoneNumberFromString(s, country)
  return parsed && parsed.isValid() ? parsed.number : null
}

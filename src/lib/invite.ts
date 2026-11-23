/** منطق نموذج الدعوة (POST /admin/users): التحقق وبناء الجسم وتوزيع أخطاء الخادم */
import type { CountryCode } from 'libphonenumber-js/min'
import type { ApiRole, CreateUserBody } from '../api/types'
import { PHONE_INVALID_MSG, toE164 } from './phone'

export type InviteField = 'name' | 'email' | 'whatsapp_number' | 'role' | 'therapist.specialty' | 'therapist.country' | 'therapist.languages'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const splitLanguages = (s: string) => s.split(/[,،]/).map((x) => x.trim()).filter(Boolean)

/** يبني جسم POST /admin/users؛ يعيد أخطاء الحقول إن وُجدت */
export function buildInvite(input: {
  name: string; email: string; whatsapp: string; country: CountryCode; role: ApiRole
  specialty?: string; therapistCountry?: string; languages?: string
}): { body: CreateUserBody | null; errors: Partial<Record<InviteField, string>> } {
  const errors: Partial<Record<InviteField, string>> = {}
  const wa = toE164(input.whatsapp, input.country)
  if (!input.name.trim()) errors.name = 'الاسم مطلوب.'
  if (!EMAIL_RE.test(input.email.trim())) errors.email = 'البريد الإلكتروني غير صحيح.'
  if (!wa) errors.whatsapp_number = PHONE_INVALID_MSG
  const body: CreateUserBody = { name: input.name.trim(), email: input.email.trim(), whatsapp_number: wa ?? '', role: input.role }
  if (input.role === 'therapist') {
    const specialty = (input.specialty ?? '').trim()
    const country = (input.therapistCountry ?? '').trim()
    if (!specialty) errors['therapist.specialty'] = 'التخصص مطلوب.'
    if (!country) errors['therapist.country'] = 'الدولة مطلوبة.'
    const languages = splitLanguages(input.languages ?? '')
    body.therapist = { specialty, country, ...(languages.length ? { languages } : {}) }
  }
  return { body: Object.keys(errors).length ? null : body, errors }
}

const FIELDS: InviteField[] = ['name', 'email', 'whatsapp_number', 'role', 'therapist.specialty', 'therapist.country', 'therapist.languages']

/** يوزّع أخطاء الخادم على حقول النموذج؛ ما لا يطابق حقلاً يظهر كرسالة عامة */
export function mapInviteErrors(fieldErrors: Record<string, string>, message: string): Partial<Record<InviteField | 'form', string>> {
  const out: Partial<Record<InviteField | 'form', string>> = {}
  for (const [k, v] of Object.entries(fieldErrors)) {
    const key = k.startsWith('therapist.languages') ? 'therapist.languages' : k
    if (FIELDS.includes(key as InviteField)) out[key as InviteField] = v
  }
  if (!Object.keys(out).length) out.form = message
  return out
}

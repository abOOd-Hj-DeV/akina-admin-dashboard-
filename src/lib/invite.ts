/** منطق نموذج الدعوة (POST /admin/users): التحقق وبناء الجسم وتوزيع أخطاء الخادم */
import type { CountryCode } from 'libphonenumber-js/min'
import type { ApiRole, CreateUserBody } from '../api/types'
import { PHONE_INVALID_MSG, toE164 } from './phone'

export type InviteField = 'name' | 'email' | 'whatsapp_number' | 'role' | 'therapist.application_ref'
export const APPLICATION_REF_TAKEN = 'رقم طلب التقديم مستخدم لمعالج آخر'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const APPLICATION_REF_RE = /^[A-Z0-9][A-Z0-9-]{1,39}$/

/** يبني جسم POST /admin/users؛ يعيد أخطاء الحقول إن وُجدت */
export function buildInvite(input: {
  name: string; email: string; whatsapp: string; country: CountryCode; role: ApiRole
  applicationRef?: string
}): { body: CreateUserBody | null; errors: Partial<Record<InviteField, string>> } {
  const errors: Partial<Record<InviteField, string>> = {}
  const wa = toE164(input.whatsapp, input.country)
  if (!input.name.trim()) errors.name = 'الاسم مطلوب.'
  if (!wa) errors.whatsapp_number = PHONE_INVALID_MSG
  const common = { name: input.name.trim(), whatsapp_number: wa ?? '' }
  let body: CreateUserBody
  if (input.role === 'therapist') {
    const application_ref = (input.applicationRef ?? '').trim().toUpperCase()
    if (!APPLICATION_REF_RE.test(application_ref)) {
      errors['therapist.application_ref'] = application_ref
        ? 'أدخل من 2 إلى 40 حرفًا لاتينيًا أو رقمًا، ويمكن استخدام الشرطة بعد الحرف أو الرقم الأول.'
        : 'رقم طلب التقديم مطلوب.'
    }
    body = { ...common, role: input.role, therapist: { application_ref } }
  } else {
    const email = input.email.trim()
    if (!EMAIL_RE.test(email)) errors.email = 'البريد الإلكتروني غير صحيح.'
    body = { ...common, role: input.role, email }
  }
  return { body: Object.keys(errors).length ? null : body, errors }
}

const FIELDS: InviteField[] = ['name', 'email', 'whatsapp_number', 'role', 'therapist.application_ref']

/** يوزّع أخطاء الخادم على حقول النموذج؛ ما لا يطابق حقلاً يظهر كرسالة عامة */
export function mapInviteErrors(fieldErrors: Record<string, string>, message: string): Partial<Record<InviteField | 'form', string>> {
  const out: Partial<Record<InviteField | 'form', string>> = {}
  for (const key of FIELDS) {
    if (fieldErrors[key]) out[key] = fieldErrors[key]
  }
  if (!Object.keys(out).length) out.form = message
  return out
}

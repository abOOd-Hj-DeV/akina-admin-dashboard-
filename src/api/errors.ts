/** ترجمة أكواد أخطاء المصادقة (عقد §2) إلى رسالة واحدة واضحة مربوطة بحقل */
import { ApiError } from './client'

export type AuthErrorCode =
  | 'otp_invalid' | 'otp_expired' | 'otp_exhausted' | 'otp_cooldown' | 'otp_send_failed'
  | 'password_reused' | 'phone_invalid' | 'therapist_pending_approval' | 'whatsapp_not_registered'

const CODE_FIELD: Record<AuthErrorCode, string | undefined> = {
  otp_invalid: 'otp', otp_expired: 'otp', otp_exhausted: 'otp', otp_cooldown: 'otp', otp_send_failed: 'otp',
  password_reused: 'password', phone_invalid: 'whatsapp_number', therapist_pending_approval: undefined,
  whatsapp_not_registered: 'whatsapp_number',
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

function codeMessage(code: AuthErrorCode, meta: Record<string, unknown>): string {
  switch (code) {
    case 'otp_invalid': {
      const n = num(meta.attempts_left)
      return n === undefined ? 'الرمز غير صحيح.' : `الرمز غير صحيح. تبقّى لك ${n} محاولات.`
    }
    case 'otp_expired': return 'انتهت صلاحية الرمز. اضغط "إعادة إرسال الرمز".'
    case 'otp_exhausted': return 'انتهت محاولات هذا الرمز. ابدأ من جديد.'
    case 'otp_cooldown': {
      const n = num(meta.retry_after)
      return n === undefined ? 'يمكنك طلب رمز جديد بعد قليل.' : `يمكنك طلب رمز جديد بعد ${n} ثانية.`
    }
    case 'otp_send_failed': return 'تعذّر إرسال الرمز على واتساب. حاول بعد قليل.'
    case 'password_reused': return 'كلمة المرور الجديدة يجب أن تختلف عن الحالية.'
    case 'phone_invalid': return 'رقم واتساب غير صحيح.'
    case 'whatsapp_not_registered': return 'هذا الرقم غير مسجّل على واتساب.'
    case 'therapist_pending_approval': return 'حساب المعالج بانتظار موافقة الإدارة.'
  }
}

export interface AuthErrorInfo {
  code?: AuthErrorCode
  /** الحقل الذي تظهر الرسالة تحته؛ undefined = رسالة عامة */
  field?: string
  message: string
  /** ثوانٍ متبقية قبل إعادة الإرسال (otp_cooldown) */
  retryAfter?: number
  /** أول رسالة لكل حقل من errors (أخطاء التحقق 422) */
  fieldErrors?: Record<string, string>
}

const isKnown = (c: unknown): c is AuthErrorCode => typeof c === 'string' && c in CODE_FIELD

export function describeAuthError(e: unknown, fallback: string): AuthErrorInfo {
  if (e instanceof ApiError) {
    const meta = e.meta ?? {}
    const fieldErrors: Record<string, string> = {}
    for (const [k, v] of Object.entries(e.errors ?? {})) if (v?.[0]) fieldErrors[k] = v[0]
    if (isKnown(e.code)) {
      const field = CODE_FIELD[e.code]
      const message = codeMessage(e.code, meta)
      if (field) fieldErrors[field] = message
      return { code: e.code, field, message, retryAfter: num(meta.retry_after), fieldErrors }
    }
    const [field, msg] = Object.entries(fieldErrors)[0] ?? []
    return { field, message: msg || e.message || fallback, fieldErrors }
  }
  return { message: e instanceof Error && e.message ? e.message : fallback }
}

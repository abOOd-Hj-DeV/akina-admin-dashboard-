import { describe, expect, it } from 'vitest'
import { ApiError } from './client'
import { describeAuthError } from './errors'

const err = (status: number, code?: string, meta?: Record<string, unknown>, errors?: Record<string, string[]>, message = 'server msg') =>
  new ApiError(status, message, errors, code, meta)

describe('أكواد أخطاء المصادقة (عقد §2)', () => {
  it.each([
    [err(422, 'otp_invalid', { attempts_left: 3 }), 'otp', 'الرمز غير صحيح. تبقّى لك 3 محاولات.'],
    [err(422, 'otp_expired'), 'otp', 'انتهت صلاحية الرمز. اضغط "إعادة إرسال الرمز".'],
    [err(422, 'otp_exhausted'), 'otp', 'انتهت محاولات هذا الرمز. ابدأ من جديد.'],
    [err(429, 'otp_cooldown', { retry_after: 45 }), 'otp', 'يمكنك طلب رمز جديد بعد 45 ثانية.'],
    [err(503, 'otp_send_failed'), 'otp', 'تعذّر إرسال الرمز على واتساب. حاول بعد قليل.'],
    [err(422, 'password_reused'), 'password', 'كلمة المرور الجديدة يجب أن تختلف عن الحالية.'],
    [err(422, 'phone_invalid'), 'whatsapp_number', 'رقم واتساب غير صحيح.'],
  ])('%#: رسالة واحدة تحت الحقل الصحيح', (e, field, message) => {
    const d = describeAuthError(e, 'fallback')
    expect(d.field).toBe(field)
    expect(d.message).toBe(message)
  })
  it('otp_cooldown يعيد retry_after للعدّاد', () => {
    expect(describeAuthError(err(429, 'otp_cooldown', { retry_after: 30 }), '').retryAfter).toBe(30)
  })
  it('therapist_pending_approval رسالة عامة', () => {
    expect(describeAuthError(err(403, 'therapist_pending_approval', { approval_status: 'pending' }), '').field).toBeUndefined()
  })
  it('كود غير معروف → رسالة errors الأولى أو رسالة الخادم', () => {
    expect(describeAuthError(err(422, 'weird', {}, { email: ['taken'] }), 'f')).toMatchObject({ field: 'email', message: 'taken' })
    expect(describeAuthError(err(500, 'weird'), 'f').message).toBe('server msg')
    expect(describeAuthError(err(500, undefined, undefined, undefined, ''), 'f').message).toBe('f')
  })
  it('خطأ غير ApiError → النص الاحتياطي', () => {
    expect(describeAuthError('x', 'fallback').message).toBe('fallback')
  })
})

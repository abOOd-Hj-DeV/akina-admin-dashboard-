import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { describeAuthError } from '../api/errors'
import { buildInvite, mapInviteErrors } from './invite'

const base = { name: ' د. ريم ', email: 'reem@sakina.app', whatsapp: '0983321260', country: 'SY' as const }

describe('دعوة مستخدم (POST /admin/users)', () => {
  it('دعوة معالج ترسل رقم طلب التقديم والرقم بصيغة E.164 بدون بريد إلكتروني', () => {
    const { body, errors } = buildInvite({ ...base, role: 'therapist', applicationRef: ' app-42 ' })
    expect(errors).toEqual({})
    expect(body).toEqual({
      name: 'د. ريم', whatsapp_number: '+963983321260', role: 'therapist',
      therapist: { application_ref: 'APP-42' },
    })
  })
  it.each([undefined, 'A', '-APP', 'APP 42', 'A'.repeat(41)])('رقم طلب التقديم مطلوب ويجب أن يطابق الصيغة (%s)', applicationRef => {
    const { body, errors } = buildInvite({ ...base, role: 'therapist', applicationRef })
    expect(body).toBeNull()
    expect(Object.keys(errors)).toEqual(['therapist.application_ref'])
  })
  it('البريد الإلكتروني لا يزال مطلوبًا لبقية الدعوات', () => {
    const { body, errors } = buildInvite({ ...base, role: 'support_agent', email: '' })
    expect(body).toBeNull()
    expect(Object.keys(errors)).toEqual(['email'])
  })
  it.each(['support_agent', 'content_manager', 'admin'] as const)('دعوة %s بدون حقول المعالج', (role) => {
    const { body } = buildInvite({ ...base, role })
    expect(body).toEqual({ name: 'د. ريم', email: 'reem@sakina.app', whatsapp_number: '+963983321260', role })
  })
  it('رقم غير صالح → خطأ تحت الحقل', () => {
    const { body, errors } = buildInvite({ ...base, whatsapp: '123', role: 'admin' })
    expect(body).toBeNull()
    expect(errors.whatsapp_number).toBe('رقم واتساب غير صحيح.')
  })
  it('أخطاء الخادم تُوزّع على الحقول', () => {
    expect(mapInviteErrors({ email: 'taken', 'therapist.application_ref': 'bad' }, 'x')).toEqual({ email: 'taken', 'therapist.application_ref': 'bad' })
    expect(mapInviteErrors({}, 'Forbidden')).toEqual({ form: 'Forbidden' })
  })
  it('رقم غير مسجل على واتساب → رسالة عربية تحت حقل الرقم', () => {
    const e = new ApiError(422, 'Not registered', { whatsapp_number: ['Not registered'] }, 'whatsapp_not_registered')
    const d = describeAuthError(e, 'fallback')
    expect(mapInviteErrors(d.fieldErrors ?? {}, d.message)).toEqual({ whatsapp_number: 'هذا الرقم غير مسجّل على واتساب.' })
  })
})

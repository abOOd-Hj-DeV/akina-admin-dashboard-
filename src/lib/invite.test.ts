import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { describeAuthError } from '../api/errors'
import { buildInvite, mapInviteErrors } from './invite'

const base = { name: ' د. ريم ', email: 'reem@sakina.app', whatsapp: '0983321260', country: 'SY' as const }

describe('دعوة مستخدم (POST /admin/users)', () => {
  it('دعوة معالج ترسل therapist.specialty/country/languages والرقم بصيغة E.164', () => {
    const { body, errors } = buildInvite({ ...base, role: 'therapist', specialty: 'anxiety', therapistCountry: 'SY', languages: ['ar', 'en'] })
    expect(errors).toEqual({})
    expect(body).toEqual({
      name: 'د. ريم', email: 'reem@sakina.app', whatsapp_number: '+963983321260', role: 'therapist',
      therapist: { specialty: 'anxiety', country: 'SY', languages: ['ar', 'en'] },
    })
  })
  it('اللغات اختيارية', () => {
    const { body } = buildInvite({ ...base, role: 'therapist', specialty: 'x', therapistCountry: 'SY', languages: [] })
    expect(body?.therapist).toEqual({ specialty: 'x', country: 'SY' })
  })
  it('التخصص والدولة مطلوبان للمعالج', () => {
    const { body, errors } = buildInvite({ ...base, role: 'therapist' })
    expect(body).toBeNull()
    expect(Object.keys(errors).sort()).toEqual(['therapist.country', 'therapist.specialty'])
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
    expect(mapInviteErrors({ email: 'taken', 'therapist.languages.0': 'bad' }, 'x')).toEqual({ email: 'taken', 'therapist.languages': 'bad' })
    expect(mapInviteErrors({}, 'Forbidden')).toEqual({ form: 'Forbidden' })
  })
  it('رقم غير مسجل على واتساب → رسالة عربية تحت حقل الرقم', () => {
    const e = new ApiError(422, 'Not registered', { whatsapp_number: ['Not registered'] }, 'whatsapp_not_registered')
    const d = describeAuthError(e, 'fallback')
    expect(mapInviteErrors(d.fieldErrors ?? {}, d.message)).toEqual({ whatsapp_number: 'هذا الرقم غير مسجّل على واتساب.' })
  })
})

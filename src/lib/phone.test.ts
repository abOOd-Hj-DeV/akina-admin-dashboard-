import { describe, expect, it } from 'vitest'
import { DEFAULT_COUNTRY, PHONE_COUNTRIES, toE164 } from './phone'

describe('أرقام واتساب → E.164 (عقد §1)', () => {
  it('الافتراضي سوريا', () => {
    expect(DEFAULT_COUNTRY).toBe('SY')
    expect(PHONE_COUNTRIES[0]).toMatchObject({ code: 'SY', dial: '+963' })
  })
  it.each(['0990000000', '990000000', '+963990000000', '00963990000000', '+963 99 000 0000', ' 099-000-0000 '])(
    '%j → +963990000000', (raw) => expect(toE164(raw)).toBe('+963990000000'),
  )
  it('رقم دولي يتجاوز الدولة المختارة', () => {
    expect(toE164('+966501234567', 'SY')).toBe('+966501234567')
  })
  it('رقم محلي لدولة أخرى', () => {
    expect(toE164('0501234567', 'SA')).toBe('+966501234567')
  })
  it.each(['', '   ', '123', 'abc', '+9639833', '09900000001234'])('%j غير صالح → null', (raw) => {
    expect(toE164(raw)).toBeNull()
  })
})

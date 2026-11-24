import { describe, expect, it } from 'vitest'
import { DEFAULT_COUNTRY, PHONE_COUNTRIES, toE164 } from './phone'

describe('أرقام واتساب → E.164 (عقد §1)', () => {
  it('الافتراضي سوريا', () => {
    expect(DEFAULT_COUNTRY).toBe('SY')
    expect(PHONE_COUNTRIES[0]).toMatchObject({ code: 'SY', dial: '+963' })
  })
  it.each(['0983321260', '983321260', '+963983321260', '00963983321260', '+963 98 332 1260', ' 098-332-1260 '])(
    '%j → +963983321260', (raw) => expect(toE164(raw)).toBe('+963983321260'),
  )
  it('رقم دولي يتجاوز الدولة المختارة', () => {
    expect(toE164('+966501234567', 'SY')).toBe('+966501234567')
  })
  it('رقم محلي لدولة أخرى', () => {
    expect(toE164('0501234567', 'SA')).toBe('+966501234567')
  })
  it.each(['', '   ', '123', 'abc', '+9639833', '09833212601234'])('%j غير صالح → null', (raw) => {
    expect(toE164(raw)).toBeNull()
  })
})

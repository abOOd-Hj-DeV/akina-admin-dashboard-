import { describe, expect, it } from 'vitest'
import { meetsPasswordPolicy, passwordError, PASSWORD_POLICY_MSG } from './password'

describe('سياسة كلمة المرور (عقد §3)', () => {
  it('الرسالة مطابقة للعقد', () => {
    expect(PASSWORD_POLICY_MSG).toBe('كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف ورقم.')
  })
  it.each(['abcdefg1', 'A1bcdefg', 'كلمةسر12', 'pass word 9'])('%j مقبولة', (p) => {
    expect(meetsPasswordPolicy(p)).toBe(true)
    expect(passwordError(p)).toBeNull()
  })
  it.each(['', 'abc1', 'abcdefgh', '12345678', 'abcdef1'])('%j مرفوضة', (p) => {
    expect(meetsPasswordPolicy(p)).toBe(false)
    expect(passwordError(p)).toBe(PASSWORD_POLICY_MSG)
  })
  it.each([
    ['abcde1🙂', false],
    ['abcdef1🙂', true],
    ['كلمةسر١٢', true],
    ['كلمةس١٢', false],
  ])('counts Unicode code points and recognizes Laravel letter/number classes', (input, valid) => {
    expect(meetsPasswordPolicy(input)).toBe(valid)
  })
})

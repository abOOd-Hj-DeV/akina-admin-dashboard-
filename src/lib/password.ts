/** سياسة كلمة المرور الموحّدة مع الباك اند: 8 أحرف على الأقل + حرف + رقم (عقد §3) */
export const PASSWORD_POLICY_MSG = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف ورقم.'
export const PASSWORD_MISMATCH_MSG = 'كلمتا المرور غير متطابقتين.'

export const meetsPasswordPolicy = (p: string) => p.length >= 8 && /\p{L}/u.test(p) && /\p{N}/u.test(p)

/** يرجع رسالة الخطأ أو null */
export function passwordError(p: string): string | null {
  return meetsPasswordPolicy(p) ? null : PASSWORD_POLICY_MSG
}

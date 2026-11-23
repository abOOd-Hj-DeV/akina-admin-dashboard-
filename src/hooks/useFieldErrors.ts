import { useState } from 'react'

/** أخطاء مربوطة بالحقول: تُعرض تحت الحقل وتُمسح عند تعديله */
export function useFieldErrors<K extends string>() {
  const [errors, setErrors] = useState<Partial<Record<K | 'form', string>>>({})
  const set = (field: K | 'form', msg: string) => setErrors((e) => ({ ...e, [field]: msg }))
  const clear = (field: K | 'form') => setErrors((e) => {
    if (!(field in e)) return e
    const next = { ...e }
    delete next[field]
    return next
  })
  return { errors, set, clear, reset: () => setErrors({}), replace: setErrors }
}

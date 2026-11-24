import { useEffect, useState } from 'react'

/** عدّاد تنازلي بالثواني (زر إعادة إرسال الرمز بعد otp_cooldown) */
export function useCountdown(): [number, (seconds: number) => void] {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return [left, (s: number) => setLeft(Math.max(0, Math.ceil(s)))]
}

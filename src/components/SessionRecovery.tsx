import { useAuth } from '../auth/AuthContext'

export default function SessionRecovery() {
  const { recovery, retryRestore, restartLogin } = useAuth()
  if (!recovery) return <div className="auth-page" role="status">جارٍ استعادة الجلسة…</div>
  return (
    <div className="auth-page">
      <div className="rounded-3xl bg-white p-8" dir="rtl">
        <p role="status">
          {recovery === 'retry'
            ? 'تعذّر التحقق من الجلسة مؤقتاً. تحقق من اتصالك وأعد المحاولة.'
            : 'تعذّر تأكيد تجديد الجلسة. سجّل الدخول مجدداً للمتابعة بأمان.'}
        </p>
        {recovery === 'retry' && <button type="button" onClick={retryRestore}>إعادة المحاولة</button>}
        <button type="button" onClick={restartLogin}>تسجيل دخول جديد</button>
      </div>
    </div>
  )
}

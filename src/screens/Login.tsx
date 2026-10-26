import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { homeFor, ROLE_LABELS } from '../auth/permissions'
import type { Role } from '../types'

const ROLES: { role: Role; desc: string }[] = [
  { role: 'super_admin', desc: 'وصول كامل لكل الأقسام' },
  { role: 'admin', desc: 'تشغيل + مالية جزئية — بدون سريري' },
  { role: 'clinical_supervisor', desc: 'سريري + تنبيهات — بدون مال وهوية' },
  { role: 'finance_partner', desc: 'حوالاته وأرباحه فقط' },
  { role: 'support_agent', desc: 'حسابات + تذاكر — بدون علاج ومال' },
  { role: 'content_manager', desc: 'محتوى غير علاجي فقط' },
]

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const enter = (r: Role) => {
    login(r)
    nav(`/${homeFor(r)}`, { replace: true })
  }
  return (
    <div className="auth-gradient flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1d919e] text-xl text-white font-bold">س</div>
          <div>
            <h1 className="text-[24px] font-bold text-[#1f1f21]">لوحة إدارة سكينة</h1>
            <p className="text-[12px] text-[#6b7280]">Mental Health Therapy Platform</p>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-[#c7e4e7]/50 px-4 py-2.5 text-[12px] font-medium text-[#1d656e]">
          🔒 منطقة مقيدة — جميع محاولات الدخول مسجلة وتخضع للمراجعة (2FA قادم)
        </p>
        <div className="mt-6 space-y-3">
          <input className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-[#1d919e]" placeholder="البريد الإلكتروني الإداري" dir="ltr" />
          <input type="password" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-[#1d919e]" placeholder="كلمة المرور" dir="ltr" />
        </div>
        <div className="mt-4 flex items-center justify-between text-[12px]">
          <label className="flex items-center gap-1.5 text-[#6b7280]"><input type="checkbox" /> تذكرني</label>
          <span className="cursor-pointer font-medium text-[#1d919e]">استعادة كلمة المرور</span>
        </div>
        <p className="mt-5 text-center text-[12px] font-medium text-[#6b7280]">الدخول التجريبي حسب الدور:</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ROLES.map((r) => (
            <button
              key={r.role}
              onClick={() => enter(r.role)}
              className="rounded-xl border border-[#1d919e]/25 px-3 py-3 text-right transition hover:border-[#1d919e] hover:bg-[#c7e4e7]/30"
            >
              <div className="text-[14px] font-bold text-[#1d656e]">{ROLE_LABELS[r.role]}</div>
              <div className="mt-0.5 text-[12px] font-normal text-[#6b7280]">{r.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { canView, NAV, ROLE_LABELS } from '../auth/permissions'
import Icon from './Icon'

export default function Shell() {
  const { role, logout } = useAuth()
  const nav = useNavigate()
  if (!role) return null
  const items = NAV.filter((n) => canView(role, n.screen))
  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      {/* الشريط العلوي */}
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-[#eaf4f5]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
          <span className="text-[12px] font-medium text-[#1d656e]">Mental Health Therapy Platform</span>
          <nav className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
            {['تطبيق المريض', 'تطبيق المعالج', 'لوحة الإدارة'].map((t, i) => (
              <span
                key={t}
                className={`cursor-default rounded-lg px-4 py-1.5 text-[12px] font-bold ${i === 2 ? 'bg-[#1d919e] text-white' : 'text-[#6b7280]'}`}
              >
                {t}
              </span>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-3">
            <span className="rounded-lg bg-[#c7e4e7] px-3 py-1.5 text-[12px] font-bold text-[#1d656e]">
              الدور: {ROLE_LABELS[role]}
            </span>
            <button
              onClick={() => { logout(); nav('/login') }}
              className="rounded-lg border border-[#fd4438]/30 px-3 py-1.5 text-[12px] font-bold text-[#fd4438] hover:bg-red-50"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        {/* قائمة جانبية حسب الصلاحيات */}
        <aside className="w-56 shrink-0">
          <div className="sticky top-20 rounded-2xl bg-white p-3 shadow-sm">
            <div className="mb-2 px-3 text-[12px] font-medium text-[#6b7280]">شاشات الإدارة</div>
            {items.map((n) => (
              <NavLink
                key={n.screen}
                to={`/${n.screen}`}
                className={({ isActive }) =>
                  `mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] font-medium transition ${
                    isActive ? 'bg-[#1d919e] text-white' : 'text-[#1f1f21] hover:bg-[#c7e4e7]/50'
                  }`
                }
              >
                <Icon name={n.icon} size={18} />
                {n.label}
              </NavLink>
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

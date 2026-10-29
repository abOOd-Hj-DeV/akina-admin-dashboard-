import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { canView, NAV, ROLE_LABELS } from '../auth/permissions'
import { API_MOCK } from '../api/client'
import { adminApi } from '../api/admin'
import Icon from './Icon'

const TITLE_FOR: Record<string, string> = { 'patient-profile': 'ملف المريض' }

function titleFor(pathname: string) {
  const seg = pathname.replace(/^\/+/, '').split('/')[0] || 'dashboard'
  return NAV.find((n) => n.screen === seg)?.label ?? TITLE_FOR[seg] ?? 'لوحة التحكم'
}

export default function Shell() {
  const { role, userName, logout } = useAuth()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [notifs, setNotifs] = useState<{ title: string; body: string }[]>([])
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMobileNav(false); setNotifOpen(false) }, [pathname])

  useEffect(() => {
    let live = true
    adminApi.notifications()
      .then((p) => {
        if (!live) return
        const items = (p.data ?? []) as { title?: string; body?: string; message?: string; is_read?: boolean }[]
        setNotifs(items.slice(0, 8).map((n) => ({ title: n.title ?? 'إشعار', body: n.body ?? n.message ?? '' })))
        setNotifCount(items.filter((n) => n.is_read === false).length || 0)
      })
      .catch(() => {})
    return () => { live = false }
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const items = useMemo(() => (role ? NAV.filter((n) => canView(role, n.screen)) : []), [role])
  if (!role) return <Navigate to="/login" replace />

  const title = titleFor(pathname)

  return (
    <div className={`workspace ${collapsed ? 'is-collapsed' : ''}`}>
      {/* الشريط الجانبي — نفس تخطيط داشبورد المعالج */}
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <header className="sidebar-header">
          <span className="brand">
            <span className="brand-symbol">
              <img src="/assets/part2-03-imgRectangle6.png" alt="" aria-hidden />
            </span>
            <img className="brand-wordmark" src="/assets/dashboard-imgLabel.png" alt="سكينة" />
          </span>
          <button
            type="button"
            className="collapse-button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            <Icon name="panel" size={18} />
          </button>
        </header>

        <nav className="navigation" aria-label="القائمة الرئيسية">
          <div className="nav-label">القائمة الرئيسية</div>
          {items.map((n) => (
            <NavLink key={n.screen} to={`/${n.screen}`} className="nav-item" title={n.label}>
              <Icon name={n.icon} size={20} />
              <span className="nav-item-label">{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="client-reminder textured">
            <div className="client-reminder-inner">
              <strong>منصة سكينة للإدارة</strong>
              <p>إدارة المرضى والمعالجين والمدفوعات والإشراف من مكان واحد</p>
              <NavLink to="/dashboard" className="client-reminder-cta">العودة للوحة التحكم</NavLink>
            </div>
          </div>
          <div className="profile-card">
            <span className="profile-avatar" aria-hidden>{(userName || 'م').trim().charAt(0)}</span>
            <span className="profile-meta">
              <strong>{userName || 'مشرف سكينة'}</strong>
              <small>{ROLE_LABELS[role]}</small>
            </span>
            {canView(role, 'settings') && (
              <NavLink to="/settings" className="profile-gear" aria-label="الإعدادات">
                <Icon name="gear" size={16} />
              </NavLink>
            )}
          </div>
        </div>
      </aside>

      {mobileNav && <button type="button" className="sidebar-scrim" aria-label="إغلاق القائمة" onClick={() => setMobileNav(false)} />}

      <main className="workspace-main">
        {/* الشريط العلوي — عنوان الصفحة + بحث + إشعارات + خروج */}
        <div className="secondary-topbar">
          <div className="topbar-start">
            <button type="button" className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="فتح القائمة">
              <Icon name="menu" />
            </button>
            <h1>{title}</h1>
            {API_MOCK && <span className="demo-chip">وضع العرض التجريبي</span>}
          </div>
          <div className="topbar-actions">
            <label className="secondary-search">
              <Icon name="search" size={18} />
              <input type="search" placeholder="بحث…" aria-label="بحث" />
            </label>
            <div className="notif-wrap" ref={notifRef}>
              <button
                type="button"
                className="icon-button"
                aria-label="الإشعارات"
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen((v) => !v)}
              >
                <Icon name="bell" />
                {notifCount > 0 && <span className="notif-dot" />}
              </button>
              {notifOpen && (
                <div className="notif-panel" role="dialog" aria-label="الإشعارات">
                  <header>الإشعارات</header>
                  {notifs.length === 0 ? (
                    <p className="notif-empty">لا توجد إشعارات</p>
                  ) : (
                    <ul>
                      {notifs.map((n, i) => (
                        <li key={i}>
                          <strong>{n.title}</strong>
                          {n.body && <p>{n.body}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="icon-button logout-button"
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
              onClick={() => { logout(); nav('/login') }}
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  )
}

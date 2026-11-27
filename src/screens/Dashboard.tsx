import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { activityFeed, countOpenRedFlags, getOverview, listDocRequests, listPayments, listTickets, listWithdrawals } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { API_MOCK } from '../api/client'
import { Badge, Btn, Card, DataState, DataValue, PageHeader, StatCard } from '../components/ui'
import Icon from '../components/Icon'
import { Link } from 'react-router-dom'
import { formatAdminDate } from '../lib/format-date'

/** مؤشرات وضع العرض التجريبي فقط — في الوضع الحي تُجلب من /admin/overview */
const DEMO_KPIS = [
  { icon: <Icon name="users" size={22} />, label: 'المرضى النشطين', value: '247', sub: '+12% من الشهر الماضي' },
  { icon: <Icon name="stetho" size={22} />, label: 'المعالجون', value: '32', sub: '24 نشط، 8 قيد المراجعة' },
  { icon: <Icon name="money" size={22} />, label: 'الإيرادات (شهري)', value: '42,580 SR', sub: '+8% من الشهر الماضي' },
  { icon: <Icon name="calendar" size={22} />, label: 'الجلسات (هذا الشهر)', value: '1,284', sub: 'متوسط جلسة 64 دقيقة' },
]

/** ما يظهر لكل دور في لوحة التحكم حسب الـPDF */
const SHOW: Record<string, { kpis: number[]; queues: string[]; feed: boolean }> = {
  super_admin: { kpis: [0, 1, 2, 3], queues: ['money', 'clinical', 'ops'], feed: true },
  admin: { kpis: [0, 1, 2, 3], queues: ['money', 'clinical', 'ops'], feed: true }, // أعداد حالات الخطر فقط عبر الإحصاءات
  clinical_supervisor: { kpis: [], queues: ['clinical'], feed: false },        // Red Flags فقط
  finance_partner: { kpis: [], queues: ['money'], feed: false },                // بطاقة أرباحه فقط
  support_agent: { kpis: [], queues: ['tickets'], feed: false },                // تنبيهات فنية فقط
}

const ACTIONS: { to: string; label: string; icon: string; primary?: boolean }[] = [
  { to: '/patients', label: 'إدارة المرضى', icon: 'users', primary: true },
  { to: '/therapists', label: 'إدارة المعالجين', icon: 'stetho' },
  { to: '/payments', label: 'مراجعة المدفوعات', icon: 'card' },
]

export default function Dashboard() {
  const { role } = useAuth()
  const view = SHOW[role ?? 'admin']
  const empty = () => Promise.resolve([])
  // نستدعي فقط الـendpoints التي تسمح بها صلاحية الدور في الـAPI
  const canOverview = role === 'super_admin' || role === 'admin'
  const overviewState = useAsync(canOverview ? getOverview : () => Promise.resolve(null), [role])
  const { data: overview } = overviewState
  const needsPaymentList = (API_MOCK || !canOverview) && view.queues.includes('money')
  const paymentState = useAsync(needsPaymentList ? listPayments : empty, [role, needsPaymentList])
  const payments = paymentState.data ?? []
  const redFlagAccess = role ? access(role, 'red-flags') : { level: 'denied' as const }
  const canReadRedFlagCount = redFlagAccess.level !== 'denied'
  const redFlagCountState = useAsync(
    canReadRedFlagCount ? countOpenRedFlags : () => Promise.resolve(undefined),
    [role, canReadRedFlagCount],
    { interval: 15_000 },
  )
  const docRequestState = useAsync(view.queues.includes('ops') ? listDocRequests : empty, [role])
  const docRequests = docRequestState.data ?? []
  const ticketState = useAsync(view.queues.includes('tickets') ? listTickets : empty, [role])
  const tickets = ticketState.data ?? []
  const withdrawalState = useAsync(role === 'finance_partner' ? listWithdrawals : empty, [role])
  const withdrawals = withdrawalState.data ?? []
  const feedState = useAsync(view.feed ? activityFeed : empty, [role])
  const feed = feedState.data ?? []

  const kpis = API_MOCK
    ? DEMO_KPIS
    : [
        { icon: <Icon name="users" size={22} />, label: 'المرضى النشطين', value: overview ? String(overview.patients.total) : '—', sub: overview ? `${overview.patients.with_therapist} مرتبط بمعالج` : '' },
        { icon: <Icon name="stetho" size={22} />, label: 'المعالجون', value: overview ? String(Object.values(overview.therapists.by_approval).reduce((a, b) => a + b, 0)) : '—', sub: overview ? `${overview.therapists.by_approval.pending ?? 0} قيد المراجعة` : '' },
        { icon: <Icon name="money" size={22} />, label: 'مدفوعات قيد المراجعة', value: overview ? `${overview.billing.pending_payments_amount} SR` : '—', sub: overview ? `${overview.billing.pending_payments} حوالة` : '' },
        { icon: <Icon name="calendar" size={22} />, label: 'جلسات اليوم', value: overview ? String(Object.values(overview.sessions.today).reduce((a, b) => a + b, 0)) : '—', sub: overview ? `${overview.sessions.next_7_days} خلال 7 أيام` : '' },
      ]

  const QUEUES = [
    {
      icon: 'receipt', label: 'حوالات جديدة',
      count: !API_MOCK && canOverview && overview ? overview.billing.pending_payments : payments.filter((p) => p.status !== 'تمت الموافقة' && p.status !== 'مرفوض').length,
      loading: !API_MOCK && canOverview ? overviewState.loading : paymentState.loading,
      error: !API_MOCK && canOverview ? overviewState.error : paymentState.error,
      sub: 'تحتاج مراجعة وموافقة', to: '/payments', badge: 'amber' as const, kind: 'money',
    },
    {
      icon: 'flag', label: 'حالات الخطر', count: redFlagCountState.data ?? 0,
      loading: redFlagCountState.loading, error: redFlagCountState.error,
      sub: 'حالات تحتاج إشرافاً فورياً', to: '/red-flags', badge: 'red' as const, kind: 'clinical',
    },
    {
      icon: 'file', label: 'طلبات ملفات', count: docRequests.filter((d) => d.status === 'قيد المراجعة').length,
      loading: docRequestState.loading, error: docRequestState.error,
      sub: 'طلبات تغيير معالج إلخ', to: '/doc-requests', badge: 'blue' as const, kind: 'ops',
    },
    {
      icon: 'ticket', label: 'تذاكر مفتوحة', count: tickets.filter((t) => t.status === 'مفتوحة').length,
      loading: ticketState.loading, error: ticketState.error,
      sub: 'تنبيهات وبلاغات فنية', to: '/tickets', badge: 'blue' as const, kind: 'tickets',
    },
  ]
  const can = (s: Parameters<typeof access>[1]) => role && access(role, s).level !== 'denied'
  const actions = ACTIONS.filter((a) => can(a.to.slice(1) as never))
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number } | null>(null)
  useEffect(() => {
    const updateCalendarMonth = () => {
      const now = new Date()
      const next = { year: now.getFullYear(), month: now.getMonth() }
      setCalendarMonth((current) =>
        current?.year === next.year && current.month === next.month ? current : next,
      )
    }
    updateCalendarMonth()
    const timer = window.setInterval(updateCalendarMonth, 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const pendingEarnings = withdrawals
    .filter((withdrawal) => {
      const date = new Date(withdrawal.date)
      return withdrawal.status === 'pending'
        && !Number.isNaN(date.getTime())
        && calendarMonth !== null
        && date.getFullYear() === calendarMonth.year
        && date.getMonth() === calendarMonth.month
    })
    .reduce((sum, withdrawal) => sum + withdrawal.amount, 0)

  return (
    <>
      <PageHeader
        title="لوحة التحكم"
        sub={API_MOCK
          ? 'عرض تجريبي'
          : overview
            ? formatAdminDate(overview.generated_at)
            : overviewState.loading
              ? 'جارٍ التحميل…'
              : overviewState.error
                ? 'تعذّر التحميل'
                : '—'}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {view.kpis.map((i) => (
          <StatCard
            key={kpis[i].label}
            {...kpis[i]}
            loading={!API_MOCK && overviewState.loading}
            error={!API_MOCK ? overviewState.error : null}
          />
        ))}
      </div>

      <h2 className="mt-6 font-['IBM_Plex_Sans_Arabic'] text-[18px] font-normal leading-6 tracking-[-0.54px] text-[#101828]">قوائم الانتظار المباشرة</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
        {QUEUES.filter((q) => view.queues.includes(q.kind)).map((q) => (
          <Link key={q.label} to={q.to} className="no-underline">
            <Card className="flex items-center gap-4 transition hover:border-[#1d919e]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f7f7f7] text-[#135e66]"><Icon name={q.icon} size={22} /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-[16px] font-semibold text-[#0a0a0a]">
                  {q.label}
                  <Badge tone={q.badge}><DataValue loading={q.loading} error={q.error} value={q.count} /></Badge>
                </div>
                <div className="text-[12px] text-[#657381]">{q.sub}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {view.feed && (
        <>
          <h2 className="mt-6 font-['IBM_Plex_Sans_Arabic'] text-[18px] font-normal leading-6 tracking-[-0.54px] text-[#101828]">آخر الأنشطة</h2>
          <Card className="mt-3 divide-y divide-[#eff0f0] p-0">
            <DataState
              loading={feedState.loading}
              error={feedState.error}
              hasData={feedState.data !== undefined}
              empty={feedState.data !== undefined && feed.length === 0}
              onRetry={feedState.reload}
            />
            {feed.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.dot }} />
                <span className="flex-1 text-[14px] text-[#0a0a0a]">{a.text}</span>
                <span className="text-[12px] text-[#657381]">{a.by} · {formatAdminDate(a.at)}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      {actions.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {actions.map((a) => (
            <Link key={a.to} to={a.to} className="no-underline">
              {a.primary ? (
                <span className="teal-button w-full !rounded-2xl !py-4 !text-[16px]"><Icon name={a.icon} size={20} /> {a.label}</span>
              ) : (
                <span className="soft-button w-full !rounded-2xl !py-4 !text-[16px]"><Icon name={a.icon} size={20} /> {a.label}</span>
              )}
            </Link>
          ))}
        </div>
      )}
      {role === 'finance_partner' && (
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] text-[#657381]">أرباحك المعلقة هذا الشهر</div>
              <div className="mt-1 text-[24px] font-semibold text-[#135e66]">
                {API_MOCK ? '8,940 SR' : <DataValue loading={withdrawalState.loading} error={withdrawalState.error} value={`${pendingEarnings.toLocaleString('en-US')} SR`} />}
              </div>
            </div>
            <Btn>طلب تصفية</Btn>
          </div>
        </Card>
      )}
    </>
  )
}

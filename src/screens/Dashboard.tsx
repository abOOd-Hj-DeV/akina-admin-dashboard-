import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { activityFeed, getOverview, listDocRequests, listPayments, listRedFlags, listTickets, listWithdrawals } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { API_MOCK } from '../api/client'
import { Badge, Btn, Card, PageHeader, StatCard } from '../components/ui'
import Icon from '../components/Icon'
import { Link } from 'react-router-dom'

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
  admin: { kpis: [0, 1, 2, 3], queues: ['money', 'ops'], feed: true },           // إحصائيات بدون حساسية — بلا Red Flags
  clinical_supervisor: { kpis: [3], queues: ['clinical'], feed: false },        // Red Flags فقط
  finance_partner: { kpis: [2, 3], queues: ['money'], feed: false },            // بطاقة أرباحه فقط
  support_agent: { kpis: [], queues: ['tickets'], feed: false },                // تنبيهات فنية فقط
}

const ACTIONS: { to: string; label: string; icon: string; primary?: boolean }[] = [
  { to: '/patients', label: 'إدارة المرضى', icon: 'users', primary: true },
  { to: '/therapists', label: 'إدارة المعالجين', icon: 'stetho' },
  { to: '/payments', label: 'مراجعة المدفوعات', icon: 'card' },
]

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

export default function Dashboard() {
  const { role } = useAuth()
  const view = SHOW[role ?? 'admin']
  const empty = () => Promise.resolve([])
  // نستدعي فقط الـendpoints التي تسمح بها صلاحية الدور في الـAPI
  const canOverview = role === 'super_admin' || role === 'admin'
  const { data: overview } = useAsync(canOverview ? getOverview : () => Promise.resolve(null))
  const { data: payments = [] } = useAsync(view.queues.includes('money') ? listPayments : empty)
  const { data: redFlags = [] } = useAsync(view.queues.includes('clinical') ? listRedFlags : empty)
  const { data: docRequests = [] } = useAsync(view.queues.includes('ops') ? listDocRequests : empty)
  const { data: tickets = [] } = useAsync(view.queues.includes('tickets') ? listTickets : empty)
  const { data: withdrawals = [] } = useAsync(role === 'finance_partner' ? listWithdrawals : empty)
  const { data: feed = [] } = useAsync(view.feed ? activityFeed : empty)

  const kpis = API_MOCK
    ? DEMO_KPIS
    : [
        { icon: <Icon name="users" size={22} />, label: 'المرضى النشطين', value: overview ? String(overview.patients.total) : '—', sub: overview ? `${overview.patients.with_therapist} مرتبط بمعالج` : '' },
        { icon: <Icon name="stetho" size={22} />, label: 'المعالجون', value: overview ? String(Object.values(overview.therapists.by_approval).reduce((a, b) => a + b, 0)) : '—', sub: overview ? `${overview.therapists.by_approval.pending ?? 0} قيد المراجعة` : '' },
        { icon: <Icon name="money" size={22} />, label: 'مدفوعات قيد المراجعة', value: overview ? `${overview.billing.pending_payments_amount} SR` : '—', sub: overview ? `${overview.billing.pending_payments} حوالة` : '' },
        { icon: <Icon name="calendar" size={22} />, label: 'جلسات اليوم', value: overview ? String(Object.values(overview.sessions.today).reduce((a, b) => a + b, 0)) : '—', sub: overview ? `${overview.sessions.next_7_days} خلال 7 أيام` : '' },
      ]

  const QUEUES = [
    { icon: 'receipt', label: 'حوالات جديدة', count: payments.filter((p) => p.status !== 'تمت الموافقة' && p.status !== 'مرفوض').length, sub: 'تحتاج مراجعة وموافقة', to: '/payments', badge: 'amber' as const, kind: 'money' },
    { icon: 'flag', label: 'Red Flags', count: redFlags.filter((r) => r.level !== 'تم الحل').length, sub: 'حالات تحتاج إشرافاً فورياً', to: '/red-flags', badge: 'red' as const, kind: 'clinical' },
    { icon: 'file', label: 'طلبات ملفات', count: docRequests.filter((d) => d.status === 'قيد المراجعة').length, sub: 'طلبات تغيير معالج إلخ', to: '/doc-requests', badge: 'blue' as const, kind: 'ops' },
    { icon: 'ticket', label: 'تذاكر مفتوحة', count: tickets.filter((t) => t.status === 'مفتوحة').length, sub: 'تنبيهات وبلاغات فنية', to: '/tickets', badge: 'blue' as const, kind: 'tickets' },
  ]
  const can = (s: Parameters<typeof access>[1]) => role && access(role, s).level !== 'denied'
  const actions = ACTIONS.filter((a) => can(a.to.slice(1) as never))
  const pendingEarnings = withdrawals.filter((w) => w.status === 'pending').reduce((s, w) => s + w.amount, 0)

  return (
    <>
      <PageHeader title="لوحة التحكم" sub={overview ? fmtDate(overview.generated_at) : API_MOCK ? 'عرض تجريبي' : 'جارٍ التحميل…'} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {view.kpis.map((i) => (
          <StatCard key={kpis[i].label} {...kpis[i]} />
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
                  <Badge tone={q.badge}>{q.count}</Badge>
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
            {feed.length === 0 ? (
              <div className="px-6 py-8 text-center text-[14px] text-[#657381]">لا توجد أنشطة بعد</div>
            ) : feed.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.dot }} />
                <span className="flex-1 text-[14px] text-[#0a0a0a]">{a.text}</span>
                <span className="text-[12px] text-[#657381]">{a.by} · {a.at}</span>
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
                {API_MOCK ? '8,940 SR' : `${pendingEarnings.toLocaleString('en-US')} SR`}
              </div>
            </div>
            <Btn>طلب تصفية</Btn>
          </div>
        </Card>
      )}
    </>
  )
}

import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { activityFeed, listDocRequests, listPayments, listRedFlags, listTickets } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { Badge, Btn, Card, PageHeader, StatCard } from '../components/ui'
import Icon from '../components/Icon'
import { Link } from 'react-router-dom'

const KPIS = [
  { icon: <Icon name="users" size={22} />, label: 'المرضى النشطين', value: '247', sub: '+12% من الشهر الماضي', tint: '#dbeafe', clinical: false },
  { icon: <Icon name="stetho" size={22} />, label: 'المعالجون', value: '32', sub: '24 نشط، 8 قيد المراجعة', tint: '#f3e8ff', clinical: false },
  { icon: <Icon name="money" size={22} />, label: 'الإيرادات (شهري)', value: '42,580 SR', sub: '+8% من الشهر الماضي', tint: '#dcfce7', clinical: false },
  { icon: <Icon name="calendar" size={22} />, label: 'الجلسات (هذا الشهر)', value: '1,284', sub: 'متوسط جلسة 64 دقيقة', tint: '#ffedd5', clinical: true },
]

// قوائم الانتظار تُحسب داخل المكوّن من بيانات الخدمة

/** ما يظهر لكل دور في لوحة التحكم حسب الـPDF */
const SHOW: Record<string, { kpis: number[]; queues: string[]; feed: boolean }> = {
  super_admin: { kpis: [0, 1, 2, 3], queues: ['money', 'clinical', 'ops'], feed: true },
  admin: { kpis: [0, 1, 2, 3], queues: ['money', 'ops'], feed: true },           // إحصائيات بدون حساسية — بلا Red Flags
  clinical_supervisor: { kpis: [3], queues: ['clinical'], feed: false },        // Red Flags فقط
  finance_partner: { kpis: [2, 3], queues: ['money'], feed: false },            // بطاقة أرباحه فقط
  support_agent: { kpis: [], queues: ['tickets'], feed: false },                // تنبيهات فنية فقط
}

const ACTIONS: { to: string; label: string; icon: string; cls: string }[] = [
  { to: '/patients', label: 'إدارة المرضى', icon: 'users', cls: 'bg-sky-500' },
  { to: '/therapists', label: 'إدارة المعالجين', icon: 'stetho', cls: 'bg-purple-500' },
  { to: '/payments', label: 'مراجعة المدفوعات', icon: 'card', cls: 'bg-emerald-500' },
]

export default function Dashboard() {
  const { role } = useAuth()
  const view = SHOW[role ?? 'admin']
  const empty = () => Promise.resolve([])
  // نستدعي فقط الـendpoints التي تسمح بها صلاحية الدور في الـAPI
  const { data: payments = [] } = useAsync(view.queues.includes('money') ? listPayments : empty)
  const { data: redFlags = [] } = useAsync(view.queues.includes('clinical') ? listRedFlags : empty)
  const { data: docRequests = [] } = useAsync(view.queues.includes('ops') ? listDocRequests : empty)
  const { data: tickets = [] } = useAsync(view.queues.includes('tickets') ? listTickets : empty)
  const { data: feed = [] } = useAsync(view.feed ? activityFeed : empty)
  const QUEUES = [
    { icon: 'receipt', label: 'حوالات جديدة', count: payments.filter((p) => p.status !== 'تمت الموافقة' && p.status !== 'مرفوض').length + 21, sub: 'تحتاج مراجعة وموافقة', to: '/payments', badge: 'amber' as const, kind: 'money' },
    { icon: 'flag', label: 'Red Flags', count: redFlags.filter((r) => r.level !== 'تم الحل').length, sub: 'حالات تحتاج إشرافاً فورياً', to: '/red-flags', badge: 'red' as const, kind: 'clinical' },
    { icon: 'file', label: 'طلبات ملفات', count: docRequests.filter((d) => d.status === 'قيد المراجعة').length + 10, sub: 'طلبات تغيير معالج إلخ', to: '/doc-requests', badge: 'blue' as const, kind: 'ops' },
    { icon: 'ticket', label: 'تذاكر مفتوحة', count: tickets.filter((t) => t.status === 'مفتوحة').length, sub: 'تنبيهات وبلاغات فنية', to: '/tickets', badge: 'blue' as const, kind: 'tickets' },
  ]
  const can = (s: Parameters<typeof access>[1]) => role && access(role, s).level !== 'denied'
  const actions = ACTIONS.filter((a) => can(a.to.slice(1) as never))

  return (
    <>
      <PageHeader title="لوحة التحكم" sub="Tuesday, November 18, 2025 9:41 AM" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {view.kpis.map((i) => (
          <StatCard key={KPIS[i].label} {...KPIS[i]} />
        ))}
      </div>

      <h2 className="mt-6 text-[18px] font-bold text-[#1f1f21]">قوائم الانتظار المباشرة</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
        {QUEUES.filter((q) => view.queues.includes(q.kind)).map((q) => (
          <Link key={q.label} to={q.to} className="no-underline">
            <Card className="flex items-center gap-4 transition hover:border-[#1d919e]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f7f7f7] text-[#1d656e]"><Icon name={q.icon} size={22} /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-[16px] font-bold text-[#1f1f21]">
                  {q.label}
                  <Badge tone={q.badge}>{q.count}</Badge>
                </div>
                <div className="text-[12px] text-[#6b7280]">{q.sub}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {view.feed && (
        <>
          <h2 className="mt-6 text-[18px] font-bold text-[#1f1f21]">آخر الأنشطة</h2>
          <Card className="mt-3 divide-y divide-gray-50 p-0">
            {feed.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-3.5">
                <span className="h-2 w-2 rounded-full" style={{ background: a.dot }} />
                <span className="flex-1 text-[14px] text-[#1f1f21]">{a.text}</span>
                <span className="text-[12px] text-[#6b7280]">{a.by} · {a.at}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      {actions.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {actions.map((a) => (
            <Link key={a.to} to={a.to}>
              <button className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-bold text-white shadow-sm transition hover:opacity-90 ${a.cls}`}>
                <Icon name={a.icon} size={20} /> {a.label}
              </button>
            </Link>
          ))}
        </div>
      )}
      {role === 'finance_partner' && (
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] text-[#6b7280]">أرباحك المعلقة هذا الشهر</div>
              <div className="mt-1 text-[24px] font-bold text-[#1d656e]">8,940 SR</div>
            </div>
            <Btn>طلب تصفية</Btn>
          </div>
        </Card>
      )}
    </>
  )
}

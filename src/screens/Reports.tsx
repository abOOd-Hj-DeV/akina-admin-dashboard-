import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { Btn, Card, PageHeader, StatCard } from '../components/ui'
import Icon from '../components/Icon'
import { API_MOCK } from '../api/client'
import { getOverview, listWithdrawals } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import type { ApiOverview } from '../api/types'
import type { Withdrawal } from '../services/data'

/** مؤشرات العرض التجريبي فقط */
const DEMO_REPORTS = {
  ops: [
    { icon: <Icon name="chart" size={22} />, label: 'الالتزام بالبرنامج', value: '74%', sub: 'متوسط كل المرضى' },
    { icon: <Icon name="stetho" size={22} />, label: 'أداء المعالجين', value: '4.7/5', sub: 'متوسط التقييم' },
    { icon: <Icon name="card" size={22} />, label: 'المدفوعات', value: '42,580 SR', sub: 'هذا الشهر' },
    { icon: <Icon name="list" size={22} />, label: 'مؤشر الامتثال', value: '96%', sub: 'السياسات والإجراءات' },
  ],
  clinical: [
    { icon: <Icon name="brain" size={22} />, label: 'تحسّن PHQ-9', value: '-38%', sub: 'متوسط التحسن خلال 8 أسابيع' },
    { icon: <Icon name="flag" size={22} />, label: 'تنبيهات معالجة', value: '41/43', sub: 'خلال 24 ساعة' },
    { icon: <Icon name="mail" size={22} />, label: 'رضا عن الجلسات', value: '4.8/5', sub: 'تقييم المرضى' },
  ],
  earnings: [
    { icon: <Icon name="money" size={22} />, label: 'أرباحك المتراكمة', value: '18,430 SR', sub: 'منذ بداية الشراكة' },
    { icon: <Icon name="receipt" size={22} />, label: 'حوالاتك هذا الشهر', value: '14', sub: '4,400 SR' },
    { icon: <Icon name="chart" size={22} />, label: 'متوسط حوالتك', value: '1,571 SR', sub: 'لكل تحويل' },
  ],
}

type Kind = 'ops' | 'clinical' | 'earnings'

/** مؤشرات مشتقة من /admin/overview و /admin/withdrawals — لا أرقام مفبركة في الوضع الحي */
function liveReports(kind: Kind, ov: ApiOverview | null, withdrawals: Withdrawal[]) {
  if (kind === 'ops') {
    const compliancePct = ov && ov.patients.total > 0
      ? Math.round((100 * (ov.patients.by_compliance.high ?? 0)) / ov.patients.total) : null
    return [
      { icon: <Icon name="card" size={22} />, label: 'المدفوعات المعتمدة (30 يوم)', value: ov ? `${ov.billing.approved_last_30_days_amount} SR` : '—', sub: '' },
      { icon: <Icon name="receipt" size={22} />, label: 'حوالات معلقة', value: ov ? String(ov.billing.pending_payments) : '—', sub: ov ? `${ov.billing.pending_payments_amount} SR` : '' },
      { icon: <Icon name="list" size={22} />, label: 'مؤشر الامتثال', value: compliancePct !== null ? `${compliancePct}%` : '—', sub: 'مرضى بالتزام مرتفع' },
      { icon: <Icon name="chart" size={22} />, label: 'اشتراكات نشطة', value: ov ? String(ov.billing.active_subscriptions) : '—', sub: '' },
    ]
  }
  if (kind === 'clinical') {
    const open = ov ? Object.values(ov.clinical.open_red_flags).reduce((a, b) => a + b, 0) : null
    return [
      { icon: <Icon name="flag" size={22} />, label: 'تنبيهات مفتوحة', value: open !== null ? String(open) : '—', sub: ov ? `${ov.clinical.open_red_flags.high ?? 0} حرجة` : '' },
      { icon: <Icon name="users" size={22} />, label: 'تنبيهات بلا مسؤول', value: ov ? String(ov.clinical.unassigned_red_flags) : '—', sub: '' },
      { icon: <Icon name="send" size={22} />, label: 'طلبات تغيير معالج', value: ov ? String(ov.clinical.pending_therapist_switches) : '—', sub: '' },
      { icon: <Icon name="calendar" size={22} />, label: 'جلسات مكتملة (30 يوم)', value: ov ? String(ov.sessions.completed_last_30_days) : '—', sub: '' },
    ]
  }
  const pending = withdrawals.filter((w) => w.status === 'pending')
  const sum = withdrawals.reduce((s, w) => s + w.amount, 0)
  return [
    { icon: <Icon name="money" size={22} />, label: 'إجمالي السحوبات', value: `${sum.toLocaleString('en-US')} SR`, sub: `${withdrawals.length} عملية` },
    { icon: <Icon name="receipt" size={22} />, label: 'سحوبات معلقة', value: String(pending.length), sub: `${pending.reduce((s, w) => s + w.amount, 0).toLocaleString('en-US')} SR` },
    { icon: <Icon name="chart" size={22} />, label: 'متوسط السحب', value: withdrawals.length ? `${Math.round(sum / withdrawals.length).toLocaleString('en-US')} SR` : '—', sub: 'لكل عملية' },
  ]
}

export default function Reports() {
  const { role } = useAuth()
  const a = role ? access(role, 'reports') : { level: 'denied' as const }
  const kind: Kind = role === 'super_admin' ? 'ops' : (a.mask as Kind) ?? 'ops'
  const { data: overview } = useAsync(!API_MOCK && (kind === 'ops' || kind === 'clinical') ? getOverview : () => Promise.resolve(null))
  const { data: withdrawals = [] } = useAsync(!API_MOCK && kind === 'earnings' ? listWithdrawals : () => Promise.resolve([]))
  const list = API_MOCK ? DEMO_REPORTS[kind] : liveReports(kind, overview ?? null, withdrawals)
  const full = a.level === 'full'

  return (
    <>
      <PageHeader
        title="التقارير"
        sub={
          kind === 'clinical' ? 'تقارير سريرية فقط حسب صلاحياتك'
          : kind === 'earnings' ? 'تقارير أرباحك فقط'
          : 'مؤشرات الأداء والتشغيل'
        }
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {list.map((r) => (
          <StatCard key={r.label} {...r} />
        ))}
      </div>
      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-semibold text-[#0a0a0a]">تصدير التقرير</h3>
            <p className="text-[12px] text-[#657381]">التصدير يُسجل في سجل التدقيق</p>
          </div>
          <div className="flex gap-2">
            <Btn tone="outline">تصدير PDF</Btn>
            <Btn tone="outline">تصدير CSV</Btn>
            {full && <Btn>تقرير مخصص</Btn>}
          </div>
        </div>
      </Card>
      {API_MOCK && kind === 'ops' && (
        <Card className="mt-4">
          <h3 className="text-[16px] font-semibold text-[#0a0a0a]">مقارنة شهرية</h3>
          <div className="mt-4 flex items-end gap-3" dir="ltr">
            {[62, 74, 58, 80, 91, 74].map((h, i) => (
              <div key={i} className="flex-1 text-center">
                <div className="rounded-t-lg bg-[#abd6db] hover:bg-[#1d919e]" style={{ height: `${h * 2}px` }} />
                <div className="mt-1 text-[12px] text-[#657381]">{['يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر'][i]}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}

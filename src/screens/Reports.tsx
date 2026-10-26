import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { Btn, Card, PageHeader, StatCard } from '../components/ui'
import Icon from '../components/Icon'

const REPORTS = {
  ops: [
    { icon: <Icon name="chart" size={22} />, label: 'الالتزام بالبرنامج', value: '74%', sub: 'متوسط كل المرضى', tint: '#dbeafe' },
    { icon: <Icon name="stetho" size={22} />, label: 'أداء المعالجين', value: '4.7/5', sub: 'متوسط التقييم', tint: '#f3e8ff' },
    { icon: <Icon name="card" size={22} />, label: 'المدفوعات', value: '42,580 SR', sub: 'هذا الشهر', tint: '#dcfce7' },
    { icon: <Icon name="list" size={22} />, label: 'مؤشر الامتثال', value: '96%', sub: 'السياسات والإجراءات', tint: '#ffedd5' },
  ],
  clinical: [
    { icon: <Icon name="brain" size={22} />, label: 'تحسّن PHQ-9', value: '-38%', sub: 'متوسط التحسن خلال 8 أسابيع', tint: '#c7e4e7' },
    { icon: <Icon name="flag" size={22} />, label: 'تنبيهات معالجة', value: '41/43', sub: 'خلال 24 ساعة', tint: '#ffedd5' },
    { icon: <Icon name="mail" size={22} />, label: 'رضا عن الجلسات', value: '4.8/5', sub: 'تقييم المرضى', tint: '#f3e8ff' },
  ],
  earnings: [
    { icon: <Icon name="money" size={22} />, label: 'أرباحك المتراكمة', value: '18,430 SR', sub: 'منذ بداية الشراكة', tint: '#dcfce7' },
    { icon: <Icon name="receipt" size={22} />, label: 'حوالاتك هذا الشهر', value: '14', sub: '4,400 SR', tint: '#dbeafe' },
    { icon: <Icon name="chart" size={22} />, label: 'متوسط حوالتك', value: '1,571 SR', sub: 'لكل تحويل', tint: '#ffedd5' },
  ],
}

export default function Reports() {
  const { role } = useAuth()
  const a = role ? access(role, 'reports') : { level: 'denied' as const }
  const kind = role === 'super_admin' ? 'ops' : (a.mask as 'ops' | 'clinical' | 'earnings') ?? 'ops'
  const list = REPORTS[kind]
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
            <h3 className="text-[16px] font-bold text-[#1f1f21]">تصدير التقرير</h3>
            <p className="text-[12px] text-[#6b7280]">التصدير يُسجل في سجل التدقيق</p>
          </div>
          <div className="flex gap-2">
            <Btn tone="outline">تصدير PDF</Btn>
            <Btn tone="outline">تصدير CSV</Btn>
            {full && <Btn>تقرير مخصص</Btn>}
          </div>
        </div>
      </Card>
      {kind === 'ops' && (
        <Card className="mt-4">
          <h3 className="text-[16px] font-bold text-[#1f1f21]">مقارنة شهرية</h3>
          <div className="mt-4 flex items-end gap-3" dir="ltr">
            {[62, 74, 58, 80, 91, 74].map((h, i) => (
              <div key={i} className="flex-1 text-center">
                <div className="rounded-t-lg bg-[#abd6db] hover:bg-[#1d919e]" style={{ height: `${h * 2}px` }} />
                <div className="mt-1 text-[12px] text-[#6b7280]">{['يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر'][i]}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}

import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { redFlags } from '../data/mock'
import { Badge, Banner, Btn, Card, PageHeader } from '../components/ui'
import Icon from '../components/Icon'

/** الإشراف الإكلينيكي: المشرف كامل، المدير الرئيسي قراءة فقط */
export default function Clinical() {
  const { role } = useAuth()
  const a = role ? access(role, 'clinical') : { level: 'denied' as const }
  const full = a.level === 'full'
  const critical = redFlags.filter((r) => r.level === 'حرج' || r.level === 'عالي')

  return (
    <>
      <PageHeader
        title="الإشراف الإكلينيكي"
        sub={!full ? 'عرض للقراءة فقط' : 'مراجعة الحالات المحالة والخطط العلاجية — بيانات بدون هوية حسب السياسة'}
      />
      {critical.length > 0 && <Banner tone="red">🚨 هناك {critical.length} حالة حرجة تحتاج تدخلاً فورياً</Banner>}

      <div className="space-y-4">
        {redFlags.map((f) => (
          <Card key={f.id} className="flex items-start gap-4">
            <span className="mt-1 text-red-500"><Icon name="flag" size={20} /></span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-bold text-[#1f1f21]">
                  {f.id} — {full ? `مريض ${f.patientId}` : `${f.patientName} (${f.patientId})`}
                </span>
                <Badge tone={f.level === 'حرج' ? 'red' : f.level === 'عالي' ? 'amber' : f.level === 'تم الحل' ? 'green' : 'blue'}>
                  {f.level}
                </Badge>
              </div>
              <p className="mt-1 text-[14px] text-[#6b7280]">{f.reason}</p>
              <p className="mt-1 text-[12px] text-[#6b7280]">المعالج: {f.therapistName} · تم الرصد: {f.detectedAt}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Btn tone="ghost" className="px-3 py-1.5 text-[12px]">عرض السجل</Btn>
              {full && f.level !== 'تم الحل' && (
                <>
                  <Btn tone="danger" className="px-3 py-1.5 text-[12px]">اتصال فوري</Btn>
                  <Btn tone="blue" className="px-3 py-1.5 text-[12px]">إحالة لجلسة طارئة</Btn>
                  <Btn tone="outline" className="px-3 py-1.5 text-[12px]">تعيين خطة متابعة</Btn>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {full && (
        <Card className="mt-6">
          <h3 className="text-[16px] font-bold text-[#1f1f21]">مراجعة جلسات وخطط علاج</h3>
          <div className="mt-3 space-y-2">
            {['مراجعة جلسة المعالج T-133 المعلّق', 'قفل خطة علاج للمريض P-1102', 'توصية بتغيير أسلوب الجلسات P-1156'].map((s) => (
              <div key={s} className="flex items-center justify-between rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px]">
                <span>{s}</span>
                <div className="flex gap-2">
                  <Btn tone="green" className="px-3 py-1.5 text-[12px]">اعتماد</Btn>
                  <Btn tone="ghost" className="px-3 py-1.5 text-[12px]">فتح</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}

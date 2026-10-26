import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { redFlags } from '../data/mock'
import { Badge, Banner, Btn, Card, PageHeader } from '../components/ui'
import Icon from '../components/Icon'

/** التصعيد Red Flags: المشرف+الرئيسي كامل، Admin عرض، الدعم يرى التنبيه فقط */
export default function RedFlags() {
  const { role } = useAuth()
  const a = role ? access(role, 'red-flags') : { level: 'denied' as const }
  const full = a.level === 'full'
  const alertOnly = a.mask === 'alert'
  const open = redFlags.filter((r) => r.level !== 'تم الحل')

  if (alertOnly) {
    return (
      <>
        <PageHeader title="تنبيهات التصعيد" sub="وضع الدعم الفني — ترى التنبيه فقط" />
        <Banner tone="red">🚨 {open.length} حالة نشطة في قائمة Red Flags — للمتابعة تواصل مع المشرف الإكلينيكي</Banner>
        <Card>
          <p className="text-[14px] text-[#6b7280]">
            لا يمكن لموظف الدعم الاطلاع على تفاصيل الحالات السريرية. تم إشعار المشرف الإكلينيكي تلقائياً.
          </p>
          <Btn className="mt-4">إشعار المشرف مرة أخرى</Btn>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="التصعيد — Red Flags" sub={!full ? 'عرض فقط — الإجراءات متاحة للمشرف الإكلينيكي والمدير الرئيسي' : undefined} />
      {open.length > 0 && <Banner tone="red">🚨 هناك {open.length} حالة نشطة — آخرها منذ دقائق</Banner>}
      <div className="space-y-4">
        {redFlags.map((f) => (
          <Card key={f.id} className="flex items-start gap-4">
            <span className={`mt-1 ${f.level === 'تم الحل' ? 'text-emerald-500' : 'text-red-500'}`}><Icon name={f.level === 'تم الحل' ? 'check' : 'flag'} size={20} /></span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-bold text-[#1f1f21]">{f.id} — {f.patientName} ({f.patientId})</span>
                <Badge tone={f.level === 'حرج' ? 'red' : f.level === 'عالي' ? 'amber' : f.level === 'تم الحل' ? 'green' : 'blue'}>{f.level}</Badge>
              </div>
              <p className="mt-1 text-[14px] text-[#6b7280]">{f.reason}</p>
              <p className="mt-1 text-[12px] text-[#6b7280]">المعالج: {f.therapistName} · {f.detectedAt}</p>
            </div>
            {full && f.level !== 'تم الحل' && (
              <div className="flex flex-col gap-2">
                <Btn tone="danger" className="px-3 py-1.5 text-[12px]">اتصال فوري</Btn>
                <Btn tone="blue" className="px-3 py-1.5 text-[12px]">إحالة لجلسة طارئة</Btn>
                <Btn tone="outline" className="px-3 py-1.5 text-[12px]">تعيين متابعة</Btn>
                <Btn tone="ghost" className="px-3 py-1.5 text-[12px]">تحويل للطوارئ</Btn>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  )
}

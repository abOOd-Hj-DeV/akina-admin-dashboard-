import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { listPrograms } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { Badge, Btn, Card, PageHeader } from '../components/ui'

/** مكتبة البرامج: المشرف+الرئيسي كامل، Admin قراءة، مدير المحتوى = المحتوى غير العلاجي فقط */
export default function Programs() {
  const { role } = useAuth()
  const a = role ? access(role, 'programs') : { level: 'denied' as const }
  const { data: programs = [] } = useAsync(listPrograms)
  const nonTher = a.mask === 'non-therapeutic'
  const readOnly = a.level === 'read'
  const list = nonTher ? programs.filter((p) => !p.therapeutic) : programs

  return (
    <>
      <PageHeader
        title="مكتبة البرامج"
        sub={
          nonTher
            ? 'صلاحيتك تشمل المحتوى غير العلاجي فقط'
            : readOnly
              ? 'قراءة فقط'
              : 'البرامج الأساسية (Core) والاختيارية (Optional)'
        }
      />
      {!nonTher && (
        <div className="mb-4 flex gap-2 text-[12px]">
          <Badge tone="teal">Core — ثابت لا يُعدّل إلا باعتماد</Badge>
          <Badge tone="purple">Optional — يضبطه المشرف فقط</Badge>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {list.map((p) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold text-[#0a0a0a]">{p.title}</span>
                  <Badge tone={p.kind === 'أساسي' ? 'teal' : p.kind === 'اختياري' ? 'purple' : 'gray'}>{p.kind}</Badge>
                </div>
                <div className="mt-1 text-[12px] text-[#657381]">
                  {p.id} · {p.modules} وحدة · {p.therapeutic ? 'محتوى علاجي' : 'محتوى عام'}
                </div>
              </div>
              <Badge tone={p.status === 'منشور' ? 'green' : p.status === 'مسودة' ? 'amber' : 'gray'}>{p.status}</Badge>
            </div>
            <div className="mt-4 flex gap-2">
              <Btn tone="ghost" className="px-3 py-1.5 text-[12px]">معاينة الوحدات</Btn>
              {a.level === 'full' && (
                <>
                  <Btn tone="outline" className="px-3 py-1.5 text-[12px]">تحرير</Btn>
                  {p.status === 'منشور' ? (
                    <Btn tone="ghost" className="px-3 py-1.5 text-[12px] text-[#657381]">أرشفة</Btn>
                  ) : (
                    <Btn tone="green" className="px-3 py-1.5 text-[12px]">نشر</Btn>
                  )}
                </>
              )}
              {nonTher && <Btn tone="outline" className="px-3 py-1.5 text-[12px]">تحرير المحتوى</Btn>}
            </div>
          </Card>
        ))}
      </div>
      {a.level === 'full' && <Btn className="mt-6">+ برنامج جديد</Btn>}
      {nonTher && <Btn className="mt-6">+ محتوى جديد</Btn>}
    </>
  )
}

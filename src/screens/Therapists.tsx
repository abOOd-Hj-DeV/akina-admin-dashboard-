import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { listTherapists } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { Badge, Btn, Card, PageHeader, SearchBar, Table } from '../components/ui'

export default function Therapists() {
  const { role } = useAuth()
  const { data: therapists = [] } = useAsync(listTherapists)
  const a = role ? access(role, 'therapists') : { level: 'denied' as const }
  const readOnly = a.level === 'read'
  const opsOnly = a.mask === 'ops' // admin: تشغيل — بدون قرارات الاعتماد السريرية؟ نقول: تعطيل/تعليق مسموح، اعتماد للمدير الرئيسي

  return (
    <>
      <PageHeader title="إدارة المعالجين" sub={readOnly ? 'قراءة فقط حسب صلاحياتك' : undefined} />
      <Card className="p-4">
        <SearchBar placeholder="ابحث بالاسم، رقم الترخيص..." />
        <div className="mt-4">
          <Table cols={['الرقم', 'الاسم', 'الحالة', 'المرضى', 'التقييم', 'تاريخ الانضمام', 'إجراءات']}>
            {therapists.map((t) => (
              <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-[#f7f7f7]/60">
                <td className="px-3 py-3 font-bold text-[#0a0a0a]">{t.id}</td>
                <td className="px-3 py-3 text-[#0a0a0a]">{t.name}</td>
                <td className="px-3 py-3">
                  <Badge tone={t.status === 'معتمد' ? 'green' : t.status === 'قيد المراجعة' ? 'amber' : 'red'}>
                    {t.status === 'معتمد' ? '✓ ' : ''}{t.status}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-[#657381]">{t.patients}</td>
                <td className="px-3 py-3 text-[#657381]">
                  {t.rating ? `⭐ ${t.rating} (${t.ratingCount})` : 'لا تقييمات'}
                </td>
                <td className="px-3 py-3 text-[#657381]">{t.joined}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-1.5">
                    <Btn tone="ghost" className="px-3 py-1.5 text-[12px]">عرض</Btn>
                    {t.status === 'قيد المراجعة' && !readOnly && role === 'super_admin' && (
                      <>
                        <Btn tone="green" className="px-3 py-1.5 text-[12px]">قبول</Btn>
                        <Btn tone="danger-soft" className="px-3 py-1.5 text-[12px]">رفض</Btn>
                      </>
                    )}
                    {t.status === 'معتمد' && (role === 'super_admin' || opsOnly) && (
                      <>
                        <Btn tone="outline" className="px-3 py-1.5 text-[12px]">تعليق</Btn>
                        <Btn tone="ghost" className="px-3 py-1.5 text-[12px]">طلب مستند</Btn>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      </Card>
    </>
  )
}

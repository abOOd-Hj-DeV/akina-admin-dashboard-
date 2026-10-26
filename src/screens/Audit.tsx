import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { auditLog } from '../data/mock'
import { Badge, Banner, Btn, Card, PageHeader, Table } from '../components/ui'

/** سجل التدقيق: Super Admin كامل، Admin قراءة فقط */
export default function Audit() {
  const { role } = useAuth()
  const a = role ? access(role, 'audit') : { level: 'denied' as const }
  const full = a.level === 'full'

  return (
    <>
      <PageHeader title="سجل التدقيق — Audit Log" sub={!full ? 'قراءة فقط' : 'Super Admin — سجل شامل'} />
      <Banner tone="purple">🔒 سجل شامل لجميع العمليات الحساسة — لا يمكن حذف أو تعديل السجلات</Banner>
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex gap-2 text-[12px]">
            <Badge tone="teal">كل الأحداث</Badge>
            <Badge tone="blue">صلاحيات</Badge>
            <Badge tone="green">مدفوعات</Badge>
            <Badge tone="red">تنبيهات</Badge>
            <Badge tone="amber">حسابات</Badge>
          </div>
          {full && <Btn tone="outline" className="px-3 py-1.5 text-[12px]">تصدير السجل</Btn>}
        </div>
        <Table cols={['الوقت', 'المستخدم', 'الإجراء', 'الهدف', 'التفاصيل', 'IP']}>
          {auditLog.map((e, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-[#f7f7f7]/60">
              <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[#6b7280]" dir="ltr">{e.time}</td>
              <td className="px-3 py-3">
                <div className="text-[14px] font-medium text-[#1f1f21]" dir="ltr">{e.user}</div>
                <div className="text-[12px] text-[#6b7280]">{e.userRole}</div>
              </td>
              <td className="px-3 py-3">
                <Badge tone={e.action === 'تنبيه تلقائي' ? 'red' : e.action.includes('دفعة') ? 'green' : e.action.includes('صلاحيات') ? 'purple' : 'blue'}>
                  {e.action}
                </Badge>
              </td>
              <td className="px-3 py-3 text-[12px] text-[#6b7280]" dir="ltr">{e.target}</td>
              <td className="max-w-56 px-3 py-3 text-[14px] text-[#6b7280]">{e.details}</td>
              <td className="px-3 py-3 text-[12px] text-[#6b7280]" dir="ltr">{e.ip}</td>
            </tr>
          ))}
        </Table>
        <div className="mt-4 flex items-center justify-between text-[12px] text-[#6b7280]">
          <span>عرض 6 من 1,247 سجلاً</span>
          <div className="flex gap-1">
            <button className="rounded-lg bg-[#1d919e] px-3 py-1.5 font-bold text-white">1</button>
            <button className="rounded-lg px-3 py-1.5">2</button>
            <button className="rounded-lg px-3 py-1.5">3</button>
            <span className="px-1">…</span>
            <button className="rounded-lg px-3 py-1.5">208</button>
          </div>
        </div>
      </Card>
    </>
  )
}

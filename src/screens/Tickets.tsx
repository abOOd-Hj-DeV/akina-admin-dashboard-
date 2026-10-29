import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { listTickets, setTicketStatus } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { Badge, Btn, Card, PageHeader, SearchBar, Table } from '../components/ui'
import Icon from '../components/Icon'

/** الدعم الفني: الدعم معالجة، المشرف عرض */
export default function Tickets() {
  const { role } = useAuth()
  const a = role ? access(role, 'tickets') : { level: 'denied' as const }
  const canProcess = a.level === 'full'
  const { data: tickets = [] } = useAsync(listTickets)
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const close = (id: string) => {
    setClosed((c) => ({ ...c, [id]: true }))
    void setTicketStatus(id, 'closed').catch(() => {})
  }

  return (
    <>
      <PageHeader title="الدعم الفني" sub={canProcess ? 'معالجة التذاكر واتصالات الطوارئ ومستندات SOP' : 'عرض فقط'} />
      <Card className="p-4">
        <SearchBar placeholder="ابحث برقم التذكرة أو العنوان..." />
        <div className="mt-4">
          <Table cols={['رقم', 'العنوان', 'مقدم البلاغ', 'الأولوية', 'الحالة', 'التاريخ', 'إجراءات']}>
            {tickets.map((t) => {
              const st = closed[t.id] ? 'مغلقة' : t.status
              return (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-[#f7f7f7]/60">
                  <td className="px-3 py-3 font-bold text-[#0a0a0a]">{t.id}</td>
                  <td className="px-3 py-3 text-[#0a0a0a]">{t.title}</td>
                  <td className="px-3 py-3 text-[#657381]">{t.openedBy}</td>
                  <td className="px-3 py-3">
                    <Badge tone={t.priority === 'عالية' ? 'red' : t.priority === 'متوسطة' ? 'amber' : 'gray'}>{t.priority}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={st === 'مفتوحة' ? 'blue' : st === 'قيد المعالجة' ? 'amber' : 'green'}>{st}</Badge>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-[#657381]">{t.date}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1.5">
                      <Btn tone="ghost" className="px-3 py-1.5 text-[12px]">فتح</Btn>
                      {canProcess && st !== 'مغلقة' && (
                        <Btn tone="outline" className="px-3 py-1.5 text-[12px]" onClick={() => close(t.id)}>
                          إغلاق
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </Table>
        </div>
      </Card>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h3 className="text-[16px] font-bold text-[#0a0a0a]">اتصالات الطوارئ</h3>
          <p className="mt-1 text-[12px] text-[#657381]">للحالات الحرجة خارج ساعات العمل</p>
          <div className="mt-3 space-y-2 text-[14px]">
            <div className="flex justify-between rounded-xl bg-red-50 px-4 py-2.5"><span>خط الطوارئ الوطني</span><b dir="ltr">920033360</b></div>
            <div className="flex justify-between rounded-xl bg-[#c7e4e7]/50 px-4 py-2.5"><span>المشرف المناوب</span><b>د. طارق العتيبي</b></div>
          </div>
        </Card>
        <Card>
          <h3 className="text-[16px] font-bold text-[#0a0a0a]">مستندات SOP</h3>
          <div className="mt-3 space-y-2 text-[14px]">
            {['دليل معالجة التذاكر.pdf', 'إجراءات التصعيد الطارئ.pdf', 'سياسة الرد خلال SLA.pdf'].map((d) => (
              <div key={d} className="flex items-center gap-2 rounded-xl bg-[#f7f7f7] px-4 py-2.5">
                <Icon name="doc" size={18} className="text-[#135e66]" /> {d}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

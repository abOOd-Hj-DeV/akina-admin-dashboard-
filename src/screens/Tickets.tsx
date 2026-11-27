import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { listEmergencyResources, listTickets, setTicketStatus } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { Badge, Btn, Card, DataState, PageHeader, SearchBar, Table } from '../components/ui'
import Icon from '../components/Icon'
import { formatAdminDate } from '../lib/format-date'

/** الدعم الفني: الدعم معالجة، المشرف عرض */
export default function Tickets() {
  const { role } = useAuth()
  const a = role ? access(role, 'tickets') : { level: 'denied' as const }
  const canProcess = a.level === 'full'
  const { data, loading, error, reload } = useAsync(listTickets)
  const { data: resources, loading: resourcesLoading, error: resourcesError, reload: reloadResources } = useAsync(listEmergencyResources)
  const contacts = [
    ...(resources?.ambulance ? [{ label: 'الإسعاف', phones: [resources.ambulance] }] : []),
    ...(resources?.police ? [{ label: 'الشرطة', phones: [resources.police] }] : []),
    ...(resources?.hotlines ?? []),
  ].filter(contact => contact.phones.length > 0)
  const tickets = data ?? []
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const [err, setErr] = useState<string | null>(null)
  const close = async (id: string) => {
    setErr(null)
    setClosed((c) => ({ ...c, [id]: true }))
    try {
      await setTicketStatus(id, 'closed')
      await reload()
    } catch (e: unknown) {
      setClosed((c) => ({ ...c, [id]: false }))
      setErr(e instanceof Error && e.message ? e.message : 'تعذّر إغلاق التذكرة.')
    }
  }

  return (
    <>
      <PageHeader title="الدعم الفني" sub={canProcess ? 'معالجة التذاكر واتصالات الطوارئ ومستندات SOP' : 'عرض فقط'} />
      {err && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-700">{err}</p>}
      <Card className="p-4">
        <SearchBar placeholder="ابحث برقم التذكرة أو العنوان..." />
        <div className="mt-4">
          <DataState loading={loading} error={error} hasData={data !== undefined} empty={data !== undefined && tickets.length === 0} onRetry={reload} />
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
                  <td className="px-3 py-3 text-[12px] text-[#657381]">{formatAdminDate(t.date)}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1.5">
                      <Btn tone="ghost" className="px-3 py-1.5 text-[12px]">فتح</Btn>
                      {canProcess && st !== 'مغلقة' && (
                        <Btn tone="outline" className="px-3 py-1.5 text-[12px]" onClick={() => void close(t.id)}>
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
          {resources?.notice && <p className="mt-1 text-[12px] text-[#657381]">{resources.notice}</p>}
          <p className="mt-1 text-[12px] text-[#657381]">لا تتوفر معلومات المناوبة.</p>
          {resourcesLoading && !resources && <p>جارٍ تحميل موارد الطوارئ…</p>}
          {resourcesError && <p role="alert">تعذّر تحميل موارد الطوارئ. <button type="button" onClick={reloadResources}>إعادة المحاولة</button></p>}
          {resources && contacts.length === 0 && <p>لا توجد أرقام طوارئ معتمدة للعرض.</p>}
          <div className="mt-3 space-y-2 text-[14px]">
            {contacts.map(({ label, phones }) => (
              <div key={label} className="flex justify-between rounded-xl bg-red-50 px-4 py-2.5">
                <span>{label}</span><b dir="ltr">{phones.join(' · ')}</b>
              </div>
            ))}
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

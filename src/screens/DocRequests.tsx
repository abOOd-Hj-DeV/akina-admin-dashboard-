import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { listDocRequests, reviewDocument } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { Badge, Btn, Card, PageHeader } from '../components/ui'
import Icon from '../components/Icon'

/** طلبات الملفات: SuperAdmin+Admin كامل، الدعم يرفع للمدير، المشرف قراءة */
export default function DocRequests() {
  const { role } = useAuth()
  const a = role ? access(role, 'doc-requests') : { level: 'denied' as const }
  const canAct = a.level === 'full'
  const escalate = a.mask === 'escalate'
  const { data: docRequests = [] } = useAsync(listDocRequests)
  const [done, setDone] = useState<Record<string, string>>({})
  const act = (id: string, label: string, action?: 'approve' | 'reject') => {
    setDone((d) => ({ ...d, [id]: label }))
    if (action) void reviewDocument(id, action).catch(() => {})
  }

  return (
    <>
      <PageHeader title="طلبات الملفات" sub={escalate ? 'يمكنك مراجعة الطلبات ورفعها للمدير' : undefined} />
      <div className="space-y-4">
        {docRequests.map((d) => {
          const st = done[d.id] ?? d.status
          return (
            <Card key={d.id} className="flex items-start gap-4">
              <span className="mt-1 text-[#1d656e]"><Icon name="file" size={20} /></span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold text-[#1f1f21]">{d.id} — {d.subject}</span>
                  <Badge tone={st === 'مقبول' ? 'green' : st === 'مرفوض' ? 'red' : st === 'مُرحّل للمدير' ? 'blue' : 'amber'}>{st}</Badge>
                </div>
                <p className="mt-1 text-[14px] text-[#6b7280]">السبب: {d.reason}</p>
                <p className="mt-1 text-[12px] text-[#6b7280]">مقدم الطلب: {d.requestedBy} · {d.date}</p>
              </div>
              <div className="flex gap-2">
                <Btn tone="ghost" className="px-3 py-1.5 text-[12px]">عرض الملف</Btn>
                {canAct && st === 'قيد المراجعة' && (
                  <>
                    <Btn tone="green" className="px-3 py-1.5 text-[12px]" onClick={() => act(d.id, 'مقبول', 'approve')}>قبول</Btn>
                    <Btn tone="danger-soft" className="px-3 py-1.5 text-[12px]" onClick={() => act(d.id, 'مرفوض', 'reject')}>رفض</Btn>
                  </>
                )}
                {escalate && st === 'قيد المراجعة' && (
                  <Btn tone="outline" className="px-3 py-1.5 text-[12px]" onClick={() => act(d.id, 'مُرحّل للمدير')}>
                    رفع للمدير
                  </Btn>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}

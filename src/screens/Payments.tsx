import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { listPayments, reviewPayment } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { Badge, Banner, Btn, Card, PageHeader } from '../components/ui'
import Icon from '../components/Icon'

/** مراجعة الحوالات: SuperAdmin+Admin كامل، الشريك المالي حوالاته فقط */
export default function Payments() {
  const { role } = useAuth()
  const a = role ? access(role, 'payments') : { level: 'denied' as const }
  const ownOnly = a.mask === 'own'
  const { data: all = [] } = useAsync(listPayments)
  const list = ownOnly ? all.filter((p) => p.partner) : all
  const [done, setDone] = useState<Record<string, 'approved' | 'rejected'>>({})
  const act = (id: string, action: 'approve' | 'reject') => {
    setDone((d) => ({ ...d, [id]: action === 'approve' ? 'approved' : 'rejected' }))
    void reviewPayment(id, action, action === 'reject' ? 'صورة غير واضحة' : undefined).catch(() => {})
  }
  const canAct = a.level === 'full' || ownOnly

  const pending = list.filter((p) => p.status !== 'تمت الموافقة' && p.status !== 'مرفوض' && !done[p.id])

  return (
    <>
      <PageHeader
        title="مراجعة الحوالات"
        sub={ownOnly ? 'عرض حوالاتك المرتبطة بشراكتك فقط' : undefined}
      />
      <Banner tone="amber"><Icon name="clock" size={14} className="ms-1 inline" /> متوسط وقت التحقق: 12 ساعة — {ownOnly ? pending.length : 24} حوالة بانتظار المراجعة</Banner>

      <div className="space-y-4">
        {list.map((p) => {
          const state = done[p.id]
          return (
            <Card key={p.id} className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#c7e4e7] text-[#135e66]"><Icon name="receipt" size={22} /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold text-[#0a0a0a]">{p.id} — {p.patientName}</span>
                  <Badge tone={state === 'approved' || p.status === 'تمت الموافقة' ? 'green' : state === 'rejected' || p.status === 'مرفوض' ? 'red' : p.status === 'تحت المراجعة' ? 'blue' : 'amber'}>
                    {state === 'approved' ? 'تمت الموافقة' : state === 'rejected' ? 'مرفوض' : p.status}
                  </Badge>
                </div>
                <div className="mt-1 flex gap-4 text-[14px] text-[#657381]">
                  <span className="font-bold text-[#135e66]">{p.amount} SR</span>
                  <span>{p.plan}</span>
                  <span>{p.date}</span>
                  <button className="font-medium text-[#1d919e]"><Icon name="doc" size={14} className="inline" /> {p.receipt} — عرض</button>
                </div>
              </div>
              {canAct && !state && p.status !== 'تمت الموافقة' && p.status !== 'مرفوض' && (
                <div className="flex gap-2">
                  <Btn tone="green" onClick={() => act(p.id, 'approve')} className="px-3 py-2 text-[12px]">
                    الموافقة وتفعيل الاشتراك
                  </Btn>
                  <Btn tone="danger-soft" onClick={() => act(p.id, 'reject')} className="px-3 py-2 text-[12px]">
                    رفض (صورة غير واضحة)
                  </Btn>
                </div>
              )}
            </Card>
          )
        })}
      </div>
      <p className="mt-4 text-[12px] text-[#657381]">عند الرفض تُرسل ملاحظة للمريض لإعادة رفع الإيصال. كل قرار يُسجل في سجل التدقيق.</p>
    </>
  )
}

import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { payments as all } from '../data/mock'
import { Badge, Banner, Btn, Card, PageHeader } from '../components/ui'
import Icon from '../components/Icon'

/** مراجعة الحوالات: SuperAdmin+Admin كامل، الشريك المالي حوالاته فقط */
export default function Payments() {
  const { role } = useAuth()
  const a = role ? access(role, 'payments') : { level: 'denied' as const }
  const ownOnly = a.mask === 'own'
  const list = ownOnly ? all.filter((p) => p.partner) : all
  const [done, setDone] = useState<Record<string, 'approved' | 'rejected'>>({})
  const canAct = a.level === 'full' || ownOnly

  const pending = list.filter((p) => p.status !== 'تمت الموافقة' && p.status !== 'مرفوض' && !done[p.id])

  return (
    <>
      <PageHeader
        title="مراجعة الحوالات"
        sub={ownOnly ? 'عرض حوالاتك المرتبطة بشراكتك فقط' : undefined}
      />
      <Banner tone="amber">⏱ متوسط وقت التحقق: 12 ساعة — {ownOnly ? pending.length : 24} حوالة بانتظار المراجعة</Banner>

      <div className="space-y-4">
        {list.map((p) => {
          const state = done[p.id]
          return (
            <Card key={p.id} className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#c7e4e7] text-[#1d656e]"><Icon name="receipt" size={22} /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold text-[#1f1f21]">{p.id} — {p.patientName}</span>
                  <Badge tone={state === 'approved' || p.status === 'تمت الموافقة' ? 'green' : state === 'rejected' || p.status === 'مرفوض' ? 'red' : p.status === 'تحت المراجعة' ? 'blue' : 'amber'}>
                    {state === 'approved' ? 'تمت الموافقة' : state === 'rejected' ? 'مرفوض' : p.status}
                  </Badge>
                </div>
                <div className="mt-1 flex gap-4 text-[14px] text-[#6b7280]">
                  <span className="font-bold text-[#1d656e]">{p.amount} SR</span>
                  <span>{p.plan}</span>
                  <span>{p.date}</span>
                  <button className="font-medium text-[#1d919e]">📎 {p.receipt} — عرض</button>
                </div>
              </div>
              {canAct && !state && p.status !== 'تمت الموافقة' && p.status !== 'مرفوض' && (
                <div className="flex gap-2">
                  <Btn tone="green" onClick={() => setDone({ ...done, [p.id]: 'approved' })} className="px-3 py-2 text-[12px]">
                    الموافقة وتفعيل الاشتراك
                  </Btn>
                  <Btn tone="danger-soft" onClick={() => setDone({ ...done, [p.id]: 'rejected' })} className="px-3 py-2 text-[12px]">
                    رفض (صورة غير واضحة)
                  </Btn>
                </div>
              )}
            </Card>
          )
        })}
      </div>
      <p className="mt-4 text-[12px] text-[#6b7280]">عند الرفض تُرسل ملاحظة للمريض لإعادة رفع الإيصال. كل قرار يُسجل في سجل التدقيق.</p>
    </>
  )
}

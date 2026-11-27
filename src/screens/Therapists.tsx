import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { access, canInviteTherapist } from '../auth/permissions'
import { listTherapists } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { Badge, Btn, Card, DataState, PageHeader, SearchBar, Table } from '../components/ui'
import InviteUserForm from '../components/InviteUserForm'

export default function Therapists() {
  const { role } = useAuth()
  const a = role ? access(role, 'therapists') : { level: 'denied' as const }
  const readOnly = a.level === 'read'
  const opsOnly = a.mask === 'ops' // admin: تشغيل — بدون قرارات الاعتماد السريرية؟ نقول: تعطيل/تعليق مسموح، اعتماد للمدير الرئيسي
  // المشرف السريري: الـAPI يسمح له بدعوة معالج فقط، بدون عرض القائمة
  const inviteOnly = a.mask === 'invite-only'
  const canListTherapists = !inviteOnly && a.level !== 'denied'
  const { data, loading, error, reload } = useAsync(
    canListTherapists ? listTherapists : () => Promise.resolve([]),
    [role, canListTherapists],
  )
  const therapists = data ?? []
  const canInvite = canInviteTherapist(role)
  const [inviting, setInviting] = useState(false)
  const [sent, setSent] = useState(false)

  return (
    <>
      <PageHeader
        title="إدارة المعالجين"
        sub={inviteOnly ? 'دعوة معالج جديد عبر واتساب' : readOnly ? 'قراءة فقط حسب صلاحياتك' : undefined}
        action={canInvite ? <Btn tone="primary" onClick={() => { setInviting((v) => !v); setSent(false) }}>+ دعوة معالج</Btn> : undefined}
      />
      {sent && <p role="status" className="mb-3 rounded-xl bg-[#c7e4e7]/50 px-4 py-2 text-[13px] font-medium text-[#135e66]">أُرسلت الدعوة عبر واتساب. سيظهر المعالج بعد تفعيل حسابه واعتماده.</p>}
      {canInvite && inviting && (
        <InviteUserForm roles={['therapist']} onCancel={() => setInviting(false)} onDone={() => { setInviting(false); setSent(true) }} />
      )}
      {!inviteOnly && <Card className="p-4">
        <DataState loading={loading} error={error} hasData={data !== undefined} empty={data !== undefined && therapists.length === 0} onRetry={reload} />
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
      </Card>}
    </>
  )
}

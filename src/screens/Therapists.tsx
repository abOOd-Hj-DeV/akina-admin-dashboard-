import { useState } from 'react'
import type { TherapistFilter } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { access, canDecideTherapist, canInviteTherapist, canRequestTherapistDocument, canToggleTherapist } from '../auth/permissions'
import { Badge, Btn, Card, DataState, PageHeader, Table } from '../components/ui'
import InviteUserForm from '../components/InviteUserForm'
import { useAsync } from '../hooks/useAsync'
import { therapistDate, THERAPIST_STATUS } from '../lib/therapists'
import { listTherapists } from '../services/data'
import { TherapistActionDialog, TherapistDetails, type TherapistAction } from './therapistDialogs'

const filters = ['all', 'not_submitted', 'pending', 'approved', 'rejected'] as const
const statusTones = { not_submitted: 'gray', pending: 'amber', approved: 'green', rejected: 'red' } as const
const PAGE_SIZE = 15

export default function Therapists() {
  const { role } = useAuth()
  const level = role ? access(role, 'therapists').level : 'denied'
  if (level === 'denied') return null
  return <TherapistRoster key={role} readOnly={level === 'read'} />
}

function TherapistRoster({ readOnly }: { readOnly: boolean }) {
  const { role } = useAuth()
  const [status, setStatus] = useState<TherapistFilter>('all')
  const [page, setPage] = useState(1)
  const { data, loading, error, refreshing, reload } = useAsync(
    () => listTherapists({ status, page, per_page: PAGE_SIZE }),
    [status, page],
  )
  const pagination = data?.pagination
  const lastPage = pagination?.last_page
  const pageOutOfRange = lastPage !== undefined && page > lastPage
  if (pageOutOfRange) setPage(lastPage)

  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [action, setAction] = useState<TherapistAction | null>(null)
  const canInvite = !readOnly && canInviteTherapist(role)
  const canDecide = canDecideTherapist(role)

  return (
    <>
      <PageHeader
        title="إدارة المعالجين"
        sub={readOnly ? 'قراءة فقط حسب صلاحياتك' : undefined}
        action={canInvite ? <Btn onClick={() => { setInviting(v => !v); setMessage('') }}>+ دعوة معالج</Btn> : undefined}
      />
      {message && <p role="status" className="mb-3 rounded-xl bg-[#c7e4e7]/50 px-4 py-2 text-[13px] font-medium text-[#135e66]">{message}</p>}
      {canInvite && inviting && (
        <InviteUserForm roles={['therapist']} onCancel={() => setInviting(false)} onDone={() => {
          setInviting(false)
          setMessage('أُرسلت الدعوة عبر واتساب. سيظهر الطلب قيد المراجعة بعد إرسال الرخصة.')
          void reload()
        }} />
      )}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[14px]">
            حالة الطلب
            <select className="rounded-xl border border-[#ebebeb] px-3 py-2" value={status} onChange={e => {
              setStatus(e.target.value as TherapistFilter)
              setPage(1)
            }}>
              {filters.map(value => <option key={value} value={value}>{value === 'all' ? 'الكل' : THERAPIST_STATUS[value]}</option>)}
            </select>
          </label>
          <Btn tone="outline" disabled={loading || refreshing} onClick={() => void reload()}>تحديث القائمة</Btn>
          {refreshing && <span role="status" className="text-[14px] text-[#657381]">جارٍ تحديث القائمة…</span>}
        </div>
        <div className="mt-4" aria-busy={loading || refreshing || pageOutOfRange}>
          <DataState loading={loading || pageOutOfRange} error={error} hasData={data !== undefined}
            empty={!refreshing && data?.data.length === 0} emptyMessage="لا يوجد معالجون بهذه الحالة." onRetry={reload} />
          {!!data?.data.length && !pageOutOfRange && (
            <Table cols={['الرقم', 'الاسم', 'حالة الطلب', 'المرضى', 'التقييم', 'تاريخ الانضمام', 'إجراءات']}>
              {data.data.map((t, index) => {
                const approval = t.approval_status ?? 'not_submitted'
                const disabled = !!action || !!error
                return (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-[#f7f7f7]/60">
                    <td className="px-3 py-3 font-bold">{(data.pagination.current_page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-3 py-3">{t.full_name}</td>
                    <td className="px-3 py-3"><Badge tone={statusTones[approval]}>{THERAPIST_STATUS[approval]}</Badge></td>
                    <td className="px-3 py-3 text-[#657381]">{t.clients_count}</td>
                    <td className="px-3 py-3 text-[#657381]">{t.rating ?? 'لا تقييمات'}</td>
                    <td className="px-3 py-3 text-[#657381]">{therapistDate(t.created_at)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Btn tone="ghost" onClick={() => setDetailId(t.id)}>عرض</Btn>
                        {canDecide && t.approval_status === 'pending' && t.has_license && (
                          <>
                            <Btn tone="green" disabled={disabled} onClick={() => setAction({ kind: 'approve', therapist: t })}>قبول</Btn>
                            <Btn tone="danger-soft" disabled={disabled} onClick={() => setAction({ kind: 'reject', therapist: t })}>رفض</Btn>
                          </>
                        )}
                        {canToggleTherapist(role) && (
                          <Btn tone="outline" disabled={disabled} onClick={() => setAction({ kind: 'active', therapist: t })}>{t.is_active ? 'تعليق' : 'تفعيل'}</Btn>
                        )}
                        {canRequestTherapistDocument(role) && (
                          <Btn tone="ghost" disabled={disabled} onClick={() => setAction({ kind: 'document', therapist: t })}>طلب مستند</Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </Table>
          )}
        </div>
        {pagination && !pageOutOfRange && !error && (pagination.total > 0 || refreshing) && (
          <nav aria-label="صفحات المعالجين" className="mt-4 flex flex-wrap items-center gap-3 text-[14px]">
            <Btn tone="outline" disabled={page <= 1 || refreshing} onClick={() => setPage(page - 1)}>السابق</Btn>
            <span>الصفحة {pagination.current_page} من {pagination.last_page} · الإجمالي {pagination.total}</span>
            <Btn tone="outline" disabled={page >= pagination.last_page || refreshing} onClick={() => setPage(page + 1)}>التالي</Btn>
          </nav>
        )}
      </Card>
      {detailId && <TherapistDetails key={detailId} id={detailId} canViewLicense={canDecide} onClose={() => setDetailId(null)} />}
      {action && <TherapistActionDialog action={action} onClose={() => setAction(null)} onDone={async (result) => {
        setMessage(result)
        await reload()
      }} />}
    </>
  )
}

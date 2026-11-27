import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { access, INVITABLE_STAFF_ROLES, ROLE_LABELS } from '../auth/permissions'
import { API_MOCK } from '../api/client'
import { describeAuthError } from '../api/errors'
import { adminApi } from '../api/admin'
import type { ApiAdminUser } from '../api/types'
import type { Role } from '../types'
import { useAsync } from '../hooks/useAsync'
import { Badge, Btn, Card, DataState, PageHeader, Table } from '../components/ui'
import InviteUserForm from '../components/InviteUserForm'
import { formatAdminDate } from '../lib/format-date'

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

const MOCK_USERS: ApiAdminUser[] = [
  { id: 'U-01', name: 'أحمد الإداري', email: 'admin@sakina.app', whatsapp_number: '+963900000001', role: 'admin', is_active: true, created_at: '2025-09-01' },
  { id: 'U-02', name: 'د. سالم المشرف', email: 'sup@sakina.app', role: 'clinical_supervisor', is_active: true, created_at: '2025-09-05' },
  { id: 'U-03', name: 'شريك المالية', email: 'fin@sakina.app', role: 'finance_partner', is_active: true, created_at: '2025-09-10' },
  { id: 'U-04', name: 'موظف الدعم', email: 'supp@sakina.app', role: 'support_agent', is_active: false, pending_invitation: true, created_at: '2025-10-02' },
]

/** إدارة المستخدمين — الرئيسي + المدير + المشرف (حسب عقد الـAPI) */
export default function Users() {
  const { role } = useAuth()
  const a = role ? access(role, 'users') : { level: 'denied' as const }
  const staffRoles: Role[] = (role && INVITABLE_STAFF_ROLES[role]) ?? []
  const canEdit = a.level === 'full' && staffRoles.length > 0
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const { data, loading, error, reload: refresh } = useAsync(
    () => (API_MOCK ? Promise.resolve({ data: MOCK_USERS, last_page: 1 }) : adminApi.users({ page })),
    [page, revision],
  )
  const users = data?.data ?? []
  const reload = () => setRevision(n => n + 1)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [adding, setAdding] = useState(false)

  const canManage = (u: ApiAdminUser) => u.role !== 'therapist' && canEdit && (
    role === 'super_admin' || (role === 'admin' && u.role !== 'super_admin' && u.role !== 'admin')
  )

  const toggle = async (u: ApiAdminUser) => {
    if (working || !u.allowed_staff_actions?.includes(u.is_active ? 'deactivate' : 'reactivate')) return
    setWorking(true)
    setErr(null)
    setNotice(null)
    try {
      await adminApi.setUserActive(u.id, !u.is_active)
    } catch (e) {
      setErr(errText(e, 'تعذّر تغيير حالة الحساب.'))
    } finally {
      reload()
      setWorking(false)
    }
  }
  const manageInvitation = async (u: ApiAdminUser, kind: 'cancel' | 'resend') => {
    if (!canManage(u) || !u.pending_invitation || working) return
    if (kind === 'cancel' && !window.confirm(`إلغاء دعوة ${u.name}؟ سيُحذف الحساب المعلّق ويصبح الرقم والبريد متاحين لدعوة جديدة.`)) return
    setWorking(true)
    setErr(null)
    setNotice(null)
    try {
      if (!API_MOCK) {
        if (kind === 'cancel') await adminApi.cancelInvitation(u.id)
        else await adminApi.resendInvitation(u.id)
      }
      setNotice(kind === 'cancel' ? 'أُلغيت الدعوة.' : 'أُرسلت الدعوة مرة أخرى.')
      if (kind === 'cancel' && users.length === 1 && page > 1) setPage(n => n - 1)
      else reload()
    } catch (e) {
      setErr(describeAuthError(e, kind === 'cancel' ? 'تعذّر إلغاء الدعوة.' : 'تعذّر إعادة إرسال الدعوة.').message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <PageHeader
        title="إدارة المستخدمين"
        sub="حسابات فريق الإدارة والمعالجين — الدعوات ترسل عبر واتساب"
        action={canEdit ? <Btn tone="primary" onClick={() => setAdding((v) => !v)}>+ دعوة مستخدم</Btn> : undefined}
      />
      {err && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-700">{err}</p>}
      {notice && <p role="status">{notice}</p>}
      {working && <p role="status">جارٍ تحديث الدعوة…</p>}
      <DataState loading={loading} error={error} hasData={data !== undefined} empty={data !== undefined && users.length === 0} onRetry={refresh} />
      {adding && (
        <InviteUserForm roles={staffRoles} onCancel={() => setAdding(false)} onDone={() => { setAdding(false); setPage(1); reload() }} />
      )}
      <Card className="p-4">
        <Table cols={['الاسم', 'واتساب', 'البريد', 'الدور', 'الحالة', 'انضم', 'إجراءات']}>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-gray-50">
              <td className="px-3 py-3 font-medium text-[#0a0a0a]">{u.name}</td>
              <td className="px-3 py-3 text-[#0a0a0a]" dir="ltr">{u.whatsapp_number || '—'}</td>
              <td className="px-3 py-3 text-[#657381]" dir="ltr">{u.email ?? '—'}</td>
              <td className="px-3 py-3"><Badge tone="purple">{u.role in ROLE_LABELS ? ROLE_LABELS[u.role as Role] : u.role}</Badge></td>
              <td className="px-3 py-3">{u.role === 'therapist'
                ? <span className="text-muted">تُعرض في إدارة المعالجين</span>
                : <Badge tone={u.is_active ? 'green' : 'gray'}>{u.pending_invitation ? 'دعوة معلّقة' : u.is_active ? 'نشط' : 'معطّل'}</Badge>}</td>
              <td className="px-3 py-3 text-[12px] text-[#657381]">{formatAdminDate(u.created_at)}</td>
              <td className="px-3 py-3">
                {u.role === 'therapist' && role && access(role, 'therapists').level !== 'denied' && (
                  <Link to={`/therapists?${new URLSearchParams({ therapist: u.id })}`} className="soft-button">
                    عرض ملف المعالج
                  </Link>
                )}
                {u.role !== 'therapist' && (
                  <div className="flex gap-1.5">
                    {u.pending_invitation && canManage(u) ? (
                      <>
                        <Btn tone="ghost" disabled={working || loading} onClick={() => void manageInvitation(u, 'resend')}>إعادة الدعوة</Btn>
                        <Btn tone="danger-soft" disabled={working || loading} onClick={() => void manageInvitation(u, 'cancel')}>إلغاء الدعوة</Btn>
                      </>
                    ) : u.allowed_staff_actions?.includes(u.is_active ? 'deactivate' : 'reactivate') && (
                      <Btn tone={u.is_active ? 'danger-soft' : 'outline'} disabled={working || loading} className="px-3 py-1.5 text-[12px]" onClick={() => void toggle(u)}>
                        {u.is_active ? 'تعطيل' : 'تفعيل'}
                      </Btn>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
        {(page > 1 || (data?.last_page ?? 1) > 1) && (
          <div className="mt-3 flex items-center gap-2">
            <Btn tone="ghost" disabled={loading || working || page === 1} onClick={() => setPage(n => n - 1)}>السابق</Btn>
            <span>{page}</span>
            <Btn tone="ghost" disabled={loading || working || page >= (data?.last_page ?? 1)} onClick={() => setPage(n => n + 1)}>التالي</Btn>
          </div>
        )}
      </Card>
    </>
  )
}

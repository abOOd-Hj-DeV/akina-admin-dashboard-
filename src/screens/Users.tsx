import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { access, INVITABLE_STAFF_ROLES, ROLE_LABELS } from '../auth/permissions'
import { API_MOCK } from '../api/client'
import { describeAuthError } from '../api/errors'
import type { ApiAdminUser } from '../api/types'
import type { Role } from '../types'
import { useAsync } from '../hooks/useAsync'
import { Badge, Btn, Card, DataState, PageHeader, Table } from '../components/ui'
import InviteUserForm from '../components/InviteUserForm'
import { formatAdminDate } from '../lib/format-date'
import { changeStaff, listStaff } from '../services/data'

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

/** إدارة المستخدمين — الرئيسي + المدير + المشرف (حسب عقد الـAPI) */
export default function Users() {
  const { role, userId } = useAuth()
  const a = role ? access(role, 'users') : { level: 'denied' as const }
  const staffRoles: Role[] = (role && INVITABLE_STAFF_ROLES[role]) ?? []
  const canEdit = a.level === 'full' && staffRoles.length > 0
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const { data, loading, refreshing, error, reload: refresh } = useAsync(
    () => listStaff(page, role, userId),
    [page, revision, role, userId],
  )
  const users = data?.data ?? []
  const reload = () => setRevision(n => n + 1)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const waits = data?.data.map((user) => user.invitation?.retry_after).filter((wait): wait is number =>
      typeof wait === 'number' && Number.isFinite(wait) && wait > 0)
    if (!waits?.length) return
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, Math.min(...waits) * 1000)
    return () => window.clearTimeout(timer)
  }, [data, refresh])

  const actionsBlocked = working || loading || refreshing || error !== null

  const toggle = async (u: ApiAdminUser) => {
    const action = u.is_active ? 'deactivate' : 'reactivate'
    if (actionsBlocked || !u.allowed_staff_actions?.includes(action)) return
    setWorking(true)
    setErr(null)
    setNotice(null)
    try {
      await changeStaff(u.id, action, role, userId)
    } catch (e) {
      setErr(errText(e, 'تعذّر تغيير حالة الحساب.'))
    } finally {
      reload()
      setWorking(false)
    }
  }
  const manageInvitation = async (u: ApiAdminUser, kind: 'cancel' | 'resend') => {
    const action = kind === 'cancel' ? 'cancel_invite' : 'resend_invite'
    if (!u.pending_invitation || actionsBlocked || !u.allowed_staff_actions?.includes(action)) return
    if (kind === 'cancel' && !window.confirm(`إلغاء دعوة ${u.name}؟ سيُحذف الحساب المعلّق ويصبح الرقم والبريد متاحين لدعوة جديدة.`)) return
    setWorking(true)
    setErr(null)
    setNotice(null)
    try {
      await changeStaff(u.id, action, role, userId)
      setNotice(kind === 'cancel' ? 'أُلغيت الدعوة.' : API_MOCK ? 'جُدّدت الدعوة التجريبية دون إرسال واتساب.' : 'أُرسلت الدعوة مرة أخرى.')
      if (kind === 'cancel' && users.length === 1 && page > 1) setPage(n => n - 1)
      else reload()
    } catch (e) {
      setErr(describeAuthError(e, kind === 'cancel' ? 'تعذّر إلغاء الدعوة.' : 'تعذّر إعادة إرسال الدعوة.').message)
      reload()
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <PageHeader
        title="إدارة المستخدمين"
        sub={API_MOCK ? 'حسابات تجريبية — لا تُرسل الدعوات عبر واتساب' : 'حسابات فريق الإدارة والمعالجين — الدعوات ترسل عبر واتساب'}
        action={canEdit ? <Btn tone="primary" onClick={() => setAdding((v) => !v)}>+ دعوة مستخدم</Btn> : undefined}
      />
      {err && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-700">{err}</p>}
      {notice && <p role="status">{notice}</p>}
      {working && <p role="status">جارٍ تحديث الحساب…</p>}
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
                    {u.pending_invitation ? (
                      <>
                        {u.invitation?.code_usable === false && <span>الرمز الحالي غير صالح</span>}
                        {(u.invitation?.retry_after ?? 0) > 0
                          ? <span>يمكن إعادة الدعوة بعد {formatAdminDate(u.invitation?.resend_available_at)}</span>
                          : u.allowed_staff_actions?.includes('resend_invite') && <Btn tone="ghost" disabled={actionsBlocked} onClick={() => void manageInvitation(u, 'resend')}>إعادة الدعوة</Btn>}
                        {u.allowed_staff_actions?.includes('cancel_invite') && <Btn tone="danger-soft" disabled={actionsBlocked} onClick={() => void manageInvitation(u, 'cancel')}>إلغاء الدعوة</Btn>}
                      </>
                    ) : u.allowed_staff_actions?.includes(u.is_active ? 'deactivate' : 'reactivate') && (
                      <Btn tone={u.is_active ? 'danger-soft' : 'outline'} disabled={actionsBlocked} className="px-3 py-1.5 text-[12px]" onClick={() => void toggle(u)}>
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

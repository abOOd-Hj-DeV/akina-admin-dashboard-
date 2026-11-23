import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { access, INVITABLE_STAFF_ROLES, ROLE_LABELS } from '../auth/permissions'
import { API_MOCK } from '../api/client'
import { adminApi } from '../api/admin'
import type { ApiAdminUser } from '../api/types'
import type { Role } from '../types'
import { useAsync } from '../hooks/useAsync'
import { Badge, Btn, Card, PageHeader, Table } from '../components/ui'
import InviteUserForm from '../components/InviteUserForm'

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

const MOCK_USERS: ApiAdminUser[] = [
  { id: 'U-01', name: 'أحمد الإداري', email: 'admin@sakina.app', whatsapp_number: '+963900000001', role: 'admin', is_active: true, created_at: '2025-09-01' },
  { id: 'U-02', name: 'د. سالم المشرف', email: 'sup@sakina.app', role: 'clinical_supervisor', is_active: true, created_at: '2025-09-05' },
  { id: 'U-03', name: 'شريك المالية', email: 'fin@sakina.app', role: 'finance_partner', is_active: true, created_at: '2025-09-10' },
  { id: 'U-04', name: 'موظف الدعم', email: 'supp@sakina.app', role: 'support_agent', is_active: false, created_at: '2025-10-02' },
]

/** إدارة المستخدمين — الرئيسي + المدير + المشرف (حسب عقد الـAPI) */
export default function Users() {
  const { role } = useAuth()
  const a = role ? access(role, 'users') : { level: 'denied' as const }
  const staffRoles: Role[] = (role && INVITABLE_STAFF_ROLES[role]) ?? []
  const canEdit = a.level === 'full' && staffRoles.length > 0
  const { data: users = [], reload } = useAsync(
    () => (API_MOCK ? Promise.resolve(MOCK_USERS) : adminApi.users().then((r) => r.data)),
  )
  const [err, setErr] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const toggle = async (u: ApiAdminUser) => {
    setErr(null)
    try {
      if (!API_MOCK) await adminApi.setUserActive(u.id, !u.is_active)
      reload()
    } catch (e) { setErr(errText(e, 'تعذّر تغيير حالة الحساب.')) }
  }
  const resend = async (u: ApiAdminUser) => {
    setErr(null)
    try { if (!API_MOCK) await adminApi.resendInvitation(u.id) } catch (e) { setErr(errText(e, 'تعذّر إعادة إرسال الدعوة.')) }
  }

  return (
    <>
      <PageHeader
        title="إدارة المستخدمين"
        sub="حسابات فريق الإدارة — الدعوات ترسل عبر واتساب"
        action={canEdit ? <Btn tone="primary" onClick={() => setAdding((v) => !v)}>+ دعوة مستخدم</Btn> : undefined}
      />
      {err && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-700">{err}</p>}
      {adding && (
        <InviteUserForm roles={staffRoles} onCancel={() => setAdding(false)} onDone={() => { setAdding(false); reload() }} />
      )}
      <Card className="p-4">
        <Table cols={['الاسم', 'واتساب', 'البريد', 'الدور', 'الحالة', 'انضم', 'إجراءات']}>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-gray-50">
              <td className="px-3 py-3 font-medium text-[#0a0a0a]">{u.name}</td>
              <td className="px-3 py-3 text-[#0a0a0a]" dir="ltr">{u.whatsapp_number || '—'}</td>
              <td className="px-3 py-3 text-[#657381]" dir="ltr">{u.email}</td>
              <td className="px-3 py-3"><Badge tone="purple">{u.role in ROLE_LABELS ? ROLE_LABELS[u.role as Role] : u.role}</Badge></td>
              <td className="px-3 py-3"><Badge tone={u.is_active ? 'green' : 'gray'}>{u.is_active ? 'نشط' : 'معطّل'}</Badge></td>
              <td className="px-3 py-3 text-[12px] text-[#657381]">{u.created_at?.slice(0, 10)}</td>
              <td className="px-3 py-3">
                {canEdit && (
                  <div className="flex gap-1.5">
                    <Btn tone={u.is_active ? 'danger-soft' : 'outline'} className="px-3 py-1.5 text-[12px]" onClick={() => void toggle(u)}>
                      {u.is_active ? 'تعطيل' : 'تفعيل'}
                    </Btn>
                    <Btn tone="ghost" className="px-3 py-1.5 text-[12px]" onClick={() => void resend(u)}>إعادة الدعوة</Btn>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}

import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { access, ROLE_LABELS } from '../auth/permissions'
import { API_MOCK } from '../api/client'
import { adminApi } from '../api/admin'
import type { ApiAdminUser, ApiRole } from '../api/types'
import type { Role } from '../types'
import { useAsync } from '../hooks/useAsync'
import { Badge, Btn, Card, PageHeader, Table } from '../components/ui'

const STAFF_ROLES: Role[] = ['admin', 'clinical_supervisor', 'finance_partner', 'support_agent', 'content_manager']

const MOCK_USERS: ApiAdminUser[] = [
  { id: 'U-01', name: 'أحمد الإداري', email: 'admin@sakina.app', role: 'admin', is_active: true, created_at: '2025-09-01' },
  { id: 'U-02', name: 'د. سالم المشرف', email: 'sup@sakina.app', role: 'clinical_supervisor', is_active: true, created_at: '2025-09-05' },
  { id: 'U-03', name: 'شريك المالية', email: 'fin@sakina.app', role: 'finance_partner', is_active: true, created_at: '2025-09-10' },
  { id: 'U-04', name: 'موظف الدعم', email: 'supp@sakina.app', role: 'support_agent', is_active: false, created_at: '2025-10-02' },
]

/** إدارة المستخدمين — الرئيسي + المدير + المشرف (حسب عقد الـAPI) */
export default function Users() {
  const { role } = useAuth()
  const a = role ? access(role, 'users') : { level: 'denied' as const }
  const canEdit = a.level === 'full'
  const { data: users = [], reload } = useAsync(
    () => (API_MOCK ? Promise.resolve(MOCK_USERS) : adminApi.users().then((r) => r.data)),
  )
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [r, setR] = useState<ApiRole>('support_agent')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)

  const invite = async () => {
    if (!email.trim() || !name.trim()) return
    setBusy(true)
    if (!API_MOCK) await adminApi.createUser({ name, email, role: r }).catch(() => {})
    setBusy(false); setEmail(''); setName(''); setAdding(false); reload()
  }
  const toggle = async (u: ApiAdminUser) => {
    if (!API_MOCK) await adminApi.setUserActive(u.id, !u.is_active).catch(() => {})
    reload()
  }
  const resend = async (u: ApiAdminUser) => {
    if (!API_MOCK) await adminApi.resendInvitation(u.id).catch(() => {})
  }

  return (
    <>
      <PageHeader
        title="إدارة المستخدمين"
        sub="حسابات فريق الإدارة — الدعوات ترسل عبر واتساب"
        action={canEdit ? <Btn tone="primary" onClick={() => setAdding((v) => !v)}>+ دعوة مستخدم</Btn> : undefined}
      />
      {adding && (
        <Card className="mb-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" className="rounded-xl border border-[#ebebeb] px-4 py-2.5 text-[14px] outline-none focus:border-[#1d919e]" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" dir="ltr" className="rounded-xl border border-[#ebebeb] px-4 py-2.5 text-[14px] outline-none focus:border-[#1d919e]" />
            <select value={r} onChange={(e) => setR(e.target.value as ApiRole)} className="rounded-xl border border-[#ebebeb] px-4 py-2.5 text-[14px] outline-none focus:border-[#1d919e]">
              {STAFF_ROLES.map((x) => <option key={x} value={x}>{ROLE_LABELS[x]}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Btn tone="green" disabled={busy} onClick={() => void invite()}>إرسال الدعوة</Btn>
            <Btn tone="ghost" onClick={() => setAdding(false)}>إلغاء</Btn>
          </div>
        </Card>
      )}
      <Card className="p-4">
        <Table cols={['الاسم', 'البريد', 'الدور', 'الحالة', 'انضم', 'إجراءات']}>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-gray-50">
              <td className="px-3 py-3 font-medium text-[#0a0a0a]">{u.name}</td>
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

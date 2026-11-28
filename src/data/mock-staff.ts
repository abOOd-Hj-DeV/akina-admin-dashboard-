import { ApiError, type LaravelPaginator } from '../api/client'
import type { ApiAdminUser, CreateUserBody, StaffAction } from '../api/types'
import type { Role } from '../types'

const cooldownMs = 60_000
const validityMs = 24 * 60 * 60_000
type MockStaff = Omit<ApiAdminUser, 'allowed_staff_actions' | 'invitation'> & { sentAt?: number }

const rows: MockStaff[] = [
  { id: 'U-01', name: 'أحمد الإداري', email: 'admin@sakina.app', whatsapp_number: '+963900000001', role: 'admin', is_active: true, activated: true, created_at: '2025-09-01' },
  { id: 'U-02', name: 'د. سالم المشرف', email: 'sup@sakina.app', role: 'clinical_supervisor', is_active: true, activated: true, created_at: '2025-09-05' },
  { id: 'U-03', name: 'شريك المالية', email: 'fin@sakina.app', role: 'finance_partner', is_active: true, activated: true, created_at: '2025-09-10' },
  {
    id: 'U-04', name: 'موظف الدعم', email: 'supp@sakina.app', role: 'support_agent', is_active: false,
    activated: false, pending_invitation: true, created_at: '2025-10-02', sentAt: Date.now() - cooldownMs,
  },
]

function project(row: MockStaff, actor: Role | null, actorId: string | null): ApiAdminUser {
  const { sentAt, ...user } = row
  const now = Date.now()
  const invitation = sentAt === undefined ? null : {
    retry_after: Math.max(0, Math.ceil((sentAt + cooldownMs - now) / 1000)),
    resend_available_at: new Date(sentAt + cooldownMs).toISOString(),
    code_usable: now < sentAt + validityMs,
  }
  const allowed_staff_actions: StaffAction[] = []
  if (row.id !== actorId && (actor === 'super_admin' || (actor === 'admin' && !['super_admin', 'admin'].includes(row.role)))) {
    if (row.activated) allowed_staff_actions.push(row.is_active ? 'deactivate' : 'reactivate')
    else if (invitation) {
      if (!invitation.retry_after) allowed_staff_actions.push('resend_invite')
      allowed_staff_actions.push('cancel_invite')
    }
  }
  return { ...user, invitation, allowed_staff_actions }
}

export const mockStaff = {
  async list(actor: Role | null, actorId: string | null, page: number): Promise<LaravelPaginator<ApiAdminUser>> {
    const pageSize = 20
    const offset = (page - 1) * pageSize
    return {
      data: rows.slice(offset, offset + pageSize).map((row) => project(row, actor, actorId)),
      current_page: page,
      last_page: Math.max(1, Math.ceil(rows.length / pageSize)),
      total: rows.length,
    }
  },
  invite(body: Exclude<CreateUserBody, { role: 'therapist' }>): void {
    if (rows.some((row) => row.whatsapp_number === body.whatsapp_number || row.email?.toLowerCase() === body.email.toLowerCase())) {
      throw new ApiError(422, 'يوجد حساب تجريبي بهذا الرقم أو البريد الإلكتروني.')
    }
    const sentAt = Date.now()
    rows.unshift({
      ...body, id: crypto.randomUUID(), is_active: false, activated: false, pending_invitation: true,
      created_at: new Date(sentAt).toISOString(), sentAt,
    })
  },
  change(id: string, action: StaffAction, actor: Role | null, actorId: string | null): void {
    const index = rows.findIndex((row) => row.id === id)
    const row = rows[index]
    if (!row || !project(row, actor, actorId).allowed_staff_actions?.includes(action)) {
      throw new ApiError(409, 'لم يعد الإجراء متاحاً لهذا الحساب التجريبي.')
    }
    if (action === 'cancel_invite') rows.splice(index, 1)
    else if (action === 'resend_invite') row.sentAt = Date.now()
    else row.is_active = action === 'reactivate'
  },
}

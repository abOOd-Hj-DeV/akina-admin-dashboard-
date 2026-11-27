/**
 * طبقة الخدمات — الشاشات تستدعي هذه الدوال فقط، والمصدر يتحدد بمتغير البيئة:
 *   VITE_API_URL مضبوط + VITE_API_MOCK!==true  → باك اند حقيقي (/api/v1/admin/*)
 *   VITE_API_URL فارغ + VITE_API_MOCK=false     → باك اند حقيقي على نفس الأصل (بروكسي /api)
 *   غير ذلك (الوضع الحالي)                    → بيانات mock من ../data/mock
 * عند الربط: لا تغيير في الشاشات — فقط تفعّل المتغيرات.
 */
import { API_MOCK, api, ApiError } from '../api/client'
import { adminApi } from '../api/admin'
import type {
  ApiAdminPatient, ApiAdminTherapist, ApiAdminTherapistDetail, ApiAuditEntry, ApiDocument, ApiEmergencyResources,
  ApiFaq, ApiOverview, ApiPayment, ApiProgram, ApiRedFlag, ApiSupportTicket, ApiWithdrawal,
  CreateUserBody, StaffAction, TherapistActionCode,
} from '../api/types'
import type {
  AuditEntry, DocRequest, Patient, Payment, Program, RedFlag, Role, Ticket,
} from '../types'
import * as mock from '../data/mock'
import { mockStaff } from '../data/mock-staff'
import { THERAPIST_OPTIONS } from '../data/therapistOptions'
import { APPLICATION_REF_TAKEN } from '../lib/invite'

const wait = <T>(v: T) => Promise.resolve(v)

/* ---------- محوّلات API → نماذج العرض ---------- */

const COMPLIANCE_PCT = { high: 85, medium: 60, low: 35 } as const

const mapPatient = (p: ApiAdminPatient): Patient => ({
  id: p.id,
  name: p.full_name,
  therapistId: p.therapist?.full_name ?? '—',
  status: p.safety_flag ? 'في خطر' : p.is_active ? 'نشط' : 'مجمّد',
  subscription: '—',
  progress: p.upcoming_sessions_count,
  compliance: COMPLIANCE_PCT[p.compliance_level],
  lastActivity: p.last_login ?? '—',
  needsReport: p.compliance_level === 'low',
})

const PAYMENT_STATUS = { pending: 'قيد المراجعة', approved: 'تمت الموافقة', rejected: 'مرفوض' } as const
const mapPayment = (p: ApiPayment): Payment => ({
  id: p.id,
  patientId: p.patient_id,
  patientName: p.patient_name,
  amount: Number(p.amount),
  plan: p.therapy_session_id ? 'جلسة مفردة' : 'اشتراك',
  date: p.created_at,
  receipt: p.proof_file_path ?? '—',
  status: PAYMENT_STATUS[p.status] ?? 'قيد المراجعة',
})

const FLAG_LEVEL = { high: 'حرج', medium: 'عالي', low: 'متوسط' } as const
export const mapFlag = (f: ApiRedFlag): RedFlag => ({
  id: f.id,
  patientId: f.patient_id,
  patientName: f.patient_name || 'مريض',
  patientWhatsapp: f.patient_whatsapp ?? null,
  type: f.type,
  source: f.source,
  priority: f.priority,
  status: f.status === 'resolved' ? 'resolved' : f.status === 'assigned' ? 'assigned' : 'open',
  assignedTo: f.assigned_to,
  assigneeName: f.assignee_name ?? null,
  therapistName: f.therapist_name ?? null,
  reason: f.description,
  level: f.status === 'resolved' ? 'تم الحل' : (FLAG_LEVEL[f.priority] ?? 'متوسط'),
  assessmentScore: f.assessment_score ?? null,
  onHold: f.on_hold,
  allowedDecisions: f.allowed_decisions ?? [],
  holdSince: f.hold_since,
  reactivationRequestedAt: f.reactivation_requested_at,
  actionTaken: f.action_taken,
  detectedAt: f.created_at,
})

export const DOCUMENT_TYPES = {
  license: 'رخصة مزاولة', identity: 'إثبات هوية', certificate: 'شهادة',
  payment_proof: 'إثبات دفع', support_file: 'ملف داعم', other: 'مستند آخر',
} as const
const DOC_TYPE: Record<string, string> = { ...DOCUMENT_TYPES, id: DOCUMENT_TYPES.identity }
const documentDownloadPath = (url: string | null | undefined) => {
  if (!url) return undefined
  try {
    const { pathname } = new URL(url, 'https://sakina.invalid')
    if (/^\/api\/v1\/files\/download\/uploads\/[\da-f-]{36}\/document_requests\/[\w.-]+$/i.test(pathname)) return pathname
  } catch { return undefined }
}
const mapDoc = (d: ApiDocument): DocRequest => ({
  id: d.id,
  subject: DOC_TYPE[d.doc_type] ?? d.doc_type ?? 'مستند',
  reason: d.reason ?? '',
  requestedBy: d.requested_by_name ?? '—',
  recipient: d.user_name ?? undefined,
  date: d.requested_at,
  status: d.status === 'requested' || d.status === 'submitted' || d.status === 'approved' || d.status === 'rejected'
    ? d.status : 'unknown',
  downloadPath: d.has_file ? documentDownloadPath(d.download_url) : undefined,
  hasFile: d.has_file,
  filename: d.original_name ?? undefined,
  reviewNote: d.review_note ?? undefined,
})

const TICKET_STATUS = { open: 'مفتوحة', in_progress: 'قيد المعالجة', resolved: 'مغلقة', closed: 'مغلقة' } as const
// الباك اند لا يملك priority؛ نشتقّ الأولوية من نوع التذكرة (سريري أعلى، تقني/مالي أوسط)
const TICKET_TYPE_PRIO: Record<string, Ticket['priority']> = {
  clinical: 'عالية', billing: 'متوسطة', technical: 'متوسطة', other: 'منخفضة',
}
const mapTicket = (t: ApiSupportTicket): Ticket => ({
  id: t.id,
  title: t.subject,
  openedBy: t.user?.name ?? '—',
  priority: TICKET_TYPE_PRIO[t.type] ?? 'متوسطة',
  status: TICKET_STATUS[t.status as keyof typeof TICKET_STATUS] ?? 'مفتوحة',
  date: t.created_at,
})

const auditDetails = (d: unknown): string => {
  if (d == null) return ''
  if (typeof d === 'string') return d
  try { return JSON.stringify(d) } catch { return String(d) }
}
const mapAudit = (a: ApiAuditEntry): AuditEntry => ({
  time: a.timestamp ?? '',
  user: a.actor?.name ?? 'SYSTEM',
  userRole: a.actor?.role ?? 'System',
  action: a.action,
  target: a.entity_id ?? '—',
  details: a.action === 'file.downloaded' && typeof a.details === 'object' && a.details !== null && 'path' in a.details
    ? auditDetails(Object.fromEntries(Object.entries(a.details).filter(([key]) => key !== 'path')))
    : auditDetails(a.details),
  ip: '—',
})

export interface Withdrawal { id: string; therapist: string; amount: number; status: string; date: string }
const mapWithdrawal = (w: ApiWithdrawal): Withdrawal => ({
  id: w.id, therapist: w.therapist_id,
  amount: Number(w.amount), status: w.status, date: w.created_at,
})

/* ---------- القراءات ---------- */

const fetchPages = async <T>(
  fetch: (page: number) => Promise<{ data: T[]; pagination?: { current_page: number; last_page: number } }>,
): Promise<T[]> => {
  const records: T[] = []
  let lastPage = 1

  for (let page = 1; page <= lastPage; page++) {
    const response = await fetch(page)
    const pagination = response.pagination
    if (!Array.isArray(response.data) || !pagination || !Number.isInteger(pagination.current_page)
      || !Number.isInteger(pagination.last_page)
      || pagination.last_page < 1 || pagination.last_page > 1000
      || pagination.current_page !== page) {
      throw new Error('تعذّر تحميل البيانات بسبب ترقيم صفحات غير صالح.')
    }
    if (page === 1) lastPage = pagination.last_page
    else if (pagination.last_page !== lastPage) throw new Error('تعذّر تحميل البيانات بسبب ترقيم صفحات غير متّسق.')
    records.push(...response.data)
  }

  return records
}

const fetchTicketPages = async (): Promise<ApiSupportTicket[]> => {
  const records: ApiSupportTicket[] = []
  let lastPage = 1

  for (let page = 1; page <= lastPage; page++) {
    const paginator = (await adminApi.tickets({ page })).data
    if (!paginator || !Array.isArray(paginator.data) || !Number.isInteger(paginator.current_page)
      || !Number.isInteger(paginator.last_page)
      || paginator.last_page < 1 || paginator.last_page > 1000
      || paginator.current_page !== page) {
      throw new Error('تعذّر تحميل البيانات بسبب ترقيم صفحات غير صالح.')
    }
    if (page === 1) lastPage = paginator.last_page
    else if (paginator.last_page !== lastPage) throw new Error('تعذّر تحميل البيانات بسبب ترقيم صفحات غير متّسق.')
    records.push(...paginator.data)
  }

  return records
}

export const listPatients = (f?: Parameters<typeof adminApi.patients>[0]) =>
  API_MOCK ? wait(mock.patients) : fetchPages(page => adminApi.patients({ ...f, page })).then(rows => rows.map(mapPatient))

export async function listTherapists(f: Parameters<typeof adminApi.therapists>[0], mockRole?: Role | null) {
  if (!API_MOCK) return adminApi.therapists(f)
  const { lifecycle_state, q, page, per_page = 15 } = f
  const query = q?.trim().toLowerCase()
  const rows = mock.therapists.filter(t => {
    const matchesStatus = !lifecycle_state || t.lifecycle_state === lifecycle_state
    return matchesStatus && (!query || t.application_ref?.toLowerCase() === query
      || t.full_name.toLowerCase().includes(query) || t.whatsapp_number?.includes(query))
  })
  const data = rows.slice((page - 1) * per_page, page * per_page)
    .map(({ published: _published, last_review: _lastReview, last_rejected_revision: _rejected, pending_revision: revision, ...row }): ApiAdminTherapist => ({
      ...row,
      pending_revision: revision ? { id: revision.id, kind: revision.kind, submitted_at: revision.submitted_at } : null,
    }))
  return {
    data,
    meta: { can_invite: mockRole === 'super_admin' || mockRole === 'clinical_supervisor' },
    pagination: { current_page: page, last_page: Math.max(1, Math.ceil(rows.length / per_page)), total: rows.length },
  }
}

const listTherapistDirectory = () =>
  API_MOCK ? wait(mock.therapists) : fetchPages(page => listTherapists({ page }))

export const listTherapistNames = () =>
  listTherapistDirectory()
    .then(rows => rows.map(({ id, full_name }) => ({ id, name: full_name })))

export async function listDocumentRecipients() {
  const rows = await listTherapistDirectory()
  const used = new Set<string>()
  return rows.map(({ id, full_name, application_ref, whatsapp_number }) => {
    const reference = application_ref?.trim()
    const digits = whatsapp_number?.replace(/\D/g, '') ?? ''
    const base = reference ? `${full_name} — رقم الطلب: ${reference}`
      : digits.length >= 4 ? `${full_name} — واتساب: ••••${digits.slice(-4)}`
      : full_name
    let label = base
    for (let index = 2; used.has(label); index++) label = `${base} (${index})`
    used.add(label)
    return { id, label }
  })
}

function getMockTherapist(id: string): ApiAdminTherapistDetail {
  const row = mock.therapists.find(t => t.id === id)
  if (!row) throw new ApiError(404, 'المعالج غير موجود.')
  return row
}

export const getTherapist = async (id: string) =>
  API_MOCK ? getMockTherapist(id) : (await adminApi.therapist(id)).data

export async function getTherapistOptions() {
  if (!API_MOCK) {
    try { return (await adminApi.therapistOptions()).data }
    catch { return THERAPIST_OPTIONS }
  }
  return THERAPIST_OPTIONS
}

export const listPayments = () =>
  API_MOCK ? wait(mock.payments) : fetchPages(page => adminApi.payments(page)).then(rows => rows.map(mapPayment))

export const listWithdrawals = (): Promise<Withdrawal[]> =>
  API_MOCK ? wait([]) : fetchPages(page => adminApi.withdrawals(page)).then(rows => rows.map(mapWithdrawal))

export const listRedFlags = () =>
  API_MOCK ? wait(mock.redFlags) : fetchPages(page => adminApi.redFlags({ page })).then(rows => rows.map(mapFlag))

export const countOpenRedFlags = () =>
  API_MOCK ? wait(mock.redFlags.filter(f => f.level !== 'تم الحل').length)
    : adminApi.redFlagCounts().then(r => Object.values(r.data.open).reduce((sum, count) => sum + count, 0))

export const listDocRequests = () =>
  API_MOCK ? wait(mock.docRequests) : fetchPages(page => adminApi.documents(page)).then(rows => rows.map(mapDoc))

// مسار الدعم يرجع paginator لارافيل خام داخل data (الصفوف في data.data)
export const listTickets = () =>
  API_MOCK ? wait(mock.tickets) : fetchTicketPages().then(rows => rows.map(mapTicket))

export const listEmergencyResources = (): Promise<ApiEmergencyResources> =>
  API_MOCK ? wait({}) : adminApi.emergencyResources().then(response => response.data)

// الباك اند لا يملك حالة نشر للبرامج؛ كل برنامج مُعاد من /admin/programs منشور فعلياً
const mapProgram = (p: ApiProgram): Program => ({
  id: p.id,
  title: p.name,
  kind: p.is_core ? 'أساسي' : 'اختياري',
  modules: p.modules_count ?? 0,
  therapeutic: true,
  status: 'منشور',
})

export const listPrograms = () =>
  API_MOCK ? wait(mock.programs) : fetchPages(page => adminApi.programs({ page })).then(rows => rows.map(mapProgram))

export const getOverview = (): Promise<ApiOverview | null> =>
  API_MOCK ? wait(null) : adminApi.overview().then(r => r.data)

export const listAudit = () =>
  API_MOCK ? wait(mock.auditLog) : fetchPages(page => adminApi.audit({ page })).then(rows => rows.map(mapAudit))

export const listFaqs = (): Promise<ApiFaq[]> =>
  API_MOCK ? wait([
    { id: 'F-1', question: 'كيف أرفع إيصال الحوالة؟', answer: 'من صفحة الاشتراك اختر رفع الإيصال.' },
    { id: 'F-2', question: 'متى تُفعّل الباقة؟', answer: 'بعد مراجعة الإيصال خلال 24 ساعة.' },
  ]) : fetchPages(page => adminApi.faqs({ page }))

export const getPatient = (id?: string | null): Promise<Patient | null> => {
  if (!id) return wait(null)
  if (API_MOCK) return wait(mock.patients.find(patient => patient.id === id) ?? null)
  return adminApi.patient(id).then(response => mapPatient(response.data))
}

export interface FeedItem { text: string; by: string; at: string; dot: string }

export const activityFeed = (): Promise<FeedItem[]> =>
  API_MOCK
    ? wait(mock.activityFeed)
    : adminApi.audit({ page: 1 }).then(({ data }) => data.slice(0, 8).map(mapAudit).map(a => ({
        text: a.action,
        by: a.user,
        at: a.time,
        dot: '#1d919e',
      })))

/* ---------- العمليات (mutations) ---------- */

export const reviewPayment = (id: string, action: 'approve' | 'reject', note?: string) =>
  API_MOCK ? wait(undefined) : adminApi.reviewPayment(id, action, note)

export async function decideTherapist(id: string, revision_id: string, action: 'approve' | 'reject', note: string) {
  if (!API_MOCK) {
    if (action === 'approve') return adminApi.approveTherapist(id, { revision_id, ...(note ? { note } : {}) })
    return adminApi.rejectTherapist(id, { revision_id, note })
  }
  const row = getMockTherapist(id)
  const revision = row.pending_revision
  if (row.last_review?.revision_id === revision_id) throw new ApiError(409, '', undefined, 'already_decided')
  if (revision?.id !== revision_id) throw new ApiError(404, '')
  if (revision.status === 'superseded') throw new ApiError(409, '', undefined, 'revision_superseded')
  if (revision.status !== 'pending') throw new ApiError(409, '', undefined, 'already_decided')
  requireMockAction(row, action)
  const approved = action === 'approve'
  const published = approved ? revision.data : row.published
  if (approved && published.email && mock.therapists.some(t => t.id !== id && t.email?.toLowerCase() === published.email?.toLowerCase())) {
    throw new ApiError(422, '', { email: ['البريد الإلكتروني مستخدم.'] })
  }
  const status = approved ? 'approved' : 'rejected'
  const lifecycle = approved || revision.kind === 'update' ? 'approved' : 'needs_changes'
  const reviewed_at = new Date().toISOString()
  mock.therapists[mock.therapists.indexOf(row)] = {
    ...row, ...published, published, full_name: published.full_name ?? row.full_name, pending_revision: null,
    approval_status: revision.kind === 'initial' ? status : row.approval_status,
    approval_note: revision.kind === 'initial' ? (approved ? null : note) : row.approval_note,
    lifecycle_state: lifecycle, allowed_actions: mock.mockLifecycleActions[lifecycle],
    last_review: { revision_id, kind: revision.kind, status, note: note || null, reviewed_at },
    last_rejected_revision: approved ? row.last_rejected_revision : { ...revision, status, review_note: note, reviewed_at },
  }
}

export async function setTherapistActive(id: string, active: boolean) {
  if (!API_MOCK) return adminApi.setUserActive(id, active)
  const row = getMockTherapist(id)
  requireMockAction(row, active ? 'reactivate' : 'suspend')
  const lifecycle = !active ? 'suspended' : row.pending_revision
    ? row.pending_revision.kind === 'update' ? 'update_pending' : 'pending_review'
    : row.approval_status === 'approved' ? 'approved'
      : row.approval_status === 'rejected' ? 'needs_changes' : 'awaiting_profile'
  mock.therapists[mock.therapists.indexOf(row)] = {
    ...row, is_active: active, lifecycle_state: lifecycle, allowed_actions: mock.mockLifecycleActions[lifecycle],
  }
}

function requireMockAction(row: ApiAdminTherapist, action: TherapistActionCode) {
  if (!row.allowed_actions?.includes(action)) throw new ApiError(409, '', undefined, 'action_not_allowed')
}

export async function manageTherapistInvitation(id: string, action: 'resend_invite' | 'cancel_invite') {
  if (!API_MOCK) return action === 'resend_invite' ? adminApi.resendInvitation(id) : adminApi.cancelInvitation(id)
  const row = getMockTherapist(id)
  requireMockAction(row, action)
  if (action === 'cancel_invite') mock.therapists.splice(mock.therapists.indexOf(row), 1)
}

export async function inviteUser(body: CreateUserBody) {
  if (!API_MOCK) return adminApi.createUser(body)
  if (body.role === 'therapist') {
    const { application_ref } = body.therapist
    if (mock.therapists.some(t => t.application_ref === application_ref)) {
      throw new ApiError(422, APPLICATION_REF_TAKEN, { 'therapist.application_ref': [APPLICATION_REF_TAKEN] })
    }
    mock.therapists.unshift(mock.mockTherapist({
      id: crypto.randomUUID(), full_name: body.name, approval_status: null, created_at: new Date().toISOString(),
      whatsapp_number: body.whatsapp_number, application_ref, lifecycle_state: 'invited', is_active: false, availability: [],
    }))
  } else mockStaff.invite(body)
}

export const listStaff = (page: number, role: Role | null, userId: string | null) =>
  API_MOCK ? mockStaff.list(role, userId, page) : adminApi.users({ page })

export async function changeStaff(id: string, action: StaffAction, role: Role | null, userId: string | null): Promise<void> {
  if (API_MOCK) return mockStaff.change(id, action, role, userId)
  if (action === 'resend_invite') await adminApi.resendInvitation(id)
  else if (action === 'cancel_invite') await adminApi.cancelInvitation(id)
  else await adminApi.setUserActive(id, action === 'reactivate')
}

export async function requestDocument(userId: string, type: keyof typeof DOCUMENT_TYPES, reason?: string) {
  if (!API_MOCK) return void await adminApi.requestDocument(userId, type, reason)
  const therapist = getMockTherapist(userId)
  mock.docRequests.unshift({
    id: crypto.randomUUID(), subject: DOCUMENT_TYPES[type], reason: reason ?? '', requestedBy: 'عرض تجريبي', recipient: therapist.full_name,
    date: new Date().toISOString(), status: 'requested',
  })
}

export async function reviewDocument(id: string, action: 'approve' | 'reject', note?: string) {
  if (!API_MOCK) return void await adminApi.reviewDocument(id, action, note)
  const row = mock.docRequests.find(d => d.id === id)
  if (!row || row.status !== 'submitted') throw new ApiError(409, 'الطلب ليس بانتظار المراجعة.')
  row.status = action === 'approve' ? 'approved' : 'rejected'
  row.reviewNote = note
}

export async function downloadDocument(doc: DocRequest) {
  if (!doc.downloadPath) return
  const blob = await api.getBlob(doc.downloadPath)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = doc.filename ?? 'مستند'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const setTicketStatus = (id: string, status: string) =>
  API_MOCK ? wait(undefined) : adminApi.setTicketStatus(id, status)

export const decideRedFlag = (
  id: string,
  decision: 'reactivate' | 'keep_hold' | 'close',
  note: string,
) =>
  API_MOCK
    ? wait(mock.applyRedFlagDecision(id, decision, note))
    : adminApi.decideRedFlag(id, { decision, note }).then(response => response.data)

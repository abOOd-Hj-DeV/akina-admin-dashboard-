/**
 * طبقة الخدمات — الشاشات تستدعي هذه الدوال فقط، والمصدر يتحدد بمتغير البيئة:
 *   VITE_API_URL مضبوط + VITE_API_MOCK!==true  → باك اند حقيقي (/api/v1/admin/*)
 *   VITE_API_URL فارغ + VITE_API_MOCK=false     → باك اند حقيقي على نفس الأصل (بروكسي /api)
 *   غير ذلك (الوضع الحالي)                    → بيانات mock من ../data/mock
 * عند الربط: لا تغيير في الشاشات — فقط تفعّل المتغيرات.
 */
import { API_MOCK } from '../api/client'
import { adminApi } from '../api/admin'
import type {
  ApiAdminPatient, ApiAdminTherapist, ApiAuditEntry, ApiDocument,
  ApiFaq, ApiOverview, ApiPayment, ApiProgram, ApiRedFlag, ApiSupportTicket, ApiWithdrawal,
} from '../api/types'
import type {
  AuditEntry, DocRequest, Patient, Payment, Program, RedFlag, Therapist, Ticket,
} from '../types'
import * as mock from '../data/mock'

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

const THERAPIST_STATUS = { pending: 'قيد المراجعة', approved: 'معتمد', rejected: 'معلّق' } as const
const mapTherapist = (t: ApiAdminTherapist): Therapist => ({
  id: t.id,
  name: t.full_name,
  status: THERAPIST_STATUS[t.approval_status] ?? 'قيد المراجعة',
  patients: t.clients_count,
  rating: t.rating ?? undefined,
  joined: t.joined_at ?? '',
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
const mapFlag = (f: ApiRedFlag): RedFlag => ({
  id: f.id,
  patientId: f.patient_id,
  patientName: f.patient_id.slice(0, 8),
  therapistName: '—',
  reason: f.description,
  level: f.status === 'resolved' ? 'تم الحل' : (FLAG_LEVEL[f.priority] ?? 'متوسط'),
  detectedAt: f.created_at,
})

const DOC_STATUS = { requested: 'قيد المراجعة', submitted: 'قيد المراجعة', pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض' } as const
const DOC_TYPE: Record<string, string> = { license: 'رخصة مزاولة', id: 'إثبات هوية', certificate: 'شهادة', other: 'مستند' }
const mapDoc = (d: ApiDocument): DocRequest => ({
  id: d.id,
  subject: DOC_TYPE[d.doc_type] ?? d.doc_type ?? 'مستند',
  reason: d.reason ?? d.review_note ?? '',
  requestedBy: d.user_name ?? d.requested_by_name ?? '—',
  date: d.requested_at,
  status: DOC_STATUS[d.status as keyof typeof DOC_STATUS] ?? 'قيد المراجعة',
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
  details: auditDetails(a.details),
  ip: '—',
})

export interface Withdrawal { id: string; therapist: string; amount: number; status: string; date: string }
const mapWithdrawal = (w: ApiWithdrawal): Withdrawal => ({
  id: w.id, therapist: w.therapist_id,
  amount: Number(w.amount), status: w.status, date: w.created_at,
})

/* ---------- القراءات ---------- */

export const listPatients = (f?: Parameters<typeof adminApi.patients>[0]) =>
  API_MOCK ? wait(mock.patients) : adminApi.patients(f).then(r => r.data.map(mapPatient))

export const listTherapists = () =>
  API_MOCK ? wait(mock.therapists) : adminApi.therapists().then(r => r.data.map(mapTherapist))

export const listPayments = () =>
  API_MOCK ? wait(mock.payments) : adminApi.payments().then(r => r.data.map(mapPayment))

export const listWithdrawals = (): Promise<Withdrawal[]> =>
  API_MOCK ? wait([]) : adminApi.withdrawals().then(r => r.data.map(mapWithdrawal))

export const listRedFlags = () =>
  API_MOCK ? wait(mock.redFlags) : adminApi.redFlags().then(r => r.data.map(mapFlag))

export const listDocRequests = () =>
  API_MOCK ? wait(mock.docRequests) : adminApi.documents().then(r => r.data.map(mapDoc))

// مسار الدعم يرجع paginator لارافيل خام داخل data (الصفوف في data.data)
export const listTickets = () =>
  API_MOCK ? wait(mock.tickets) : adminApi.tickets().then(r => (r.data?.data ?? []).map(mapTicket))

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
  API_MOCK ? wait(mock.programs) : adminApi.programs().then(r => r.data.map(mapProgram))

export const getOverview = (): Promise<ApiOverview | null> =>
  API_MOCK ? wait(null) : adminApi.overview().then(r => r.data)

export const listAudit = () =>
  API_MOCK ? wait(mock.auditLog) : adminApi.audit().then(r => r.data.map(mapAudit))

export const listFaqs = (): Promise<ApiFaq[]> =>
  API_MOCK ? wait([
    { id: 'F-1', question: 'كيف أرفع إيصال الحوالة؟', answer: 'من صفحة الاشتراك اختر رفع الإيصال.' },
    { id: 'F-2', question: 'متى تُفعّل الباقة؟', answer: 'بعد مراجعة الإيصال خلال 24 ساعة.' },
  ]) : adminApi.faqs().then(r => r.data)

export interface FeedItem { text: string; by: string; at: string; dot: string }

export const activityFeed = (): Promise<FeedItem[]> =>
  API_MOCK
    ? wait(mock.activityFeed)
    : adminApi.audit().then(r => r.data.slice(0, 8).map(a => ({
        text: a.action,
        by: a.actor?.name ?? 'النظام',
        at: a.timestamp ?? '',
        dot: '#1d919e',
      })))

/* ---------- العمليات (mutations) ---------- */

export const reviewPayment = (id: string, action: 'approve' | 'reject', note?: string) =>
  API_MOCK ? wait(undefined) : adminApi.reviewPayment(id, action, note)

export const approveTherapist = (id: string) =>
  API_MOCK ? wait(undefined) : adminApi.approveTherapist(id)

export const rejectTherapist = (id: string, reason?: string) =>
  API_MOCK ? wait(undefined) : adminApi.rejectTherapist(id, { reason })

export const reviewDocument = (id: string, action: 'approve' | 'reject', note?: string) =>
  API_MOCK ? wait(undefined) : adminApi.reviewDocument(id, action, note)

export const setTicketStatus = (id: string, status: string) =>
  API_MOCK ? wait(undefined) : adminApi.setTicketStatus(id, status)

export const assignRedFlag = (id: string, assigneeId: string) =>
  API_MOCK ? wait(undefined) : adminApi.assignRedFlag(id, assigneeId)

export const setRedFlagStatus = (id: string, status: string, action?: string) =>
  API_MOCK ? wait(undefined) : adminApi.setRedFlagStatus(id, status, action)

export type Role =
  | 'super_admin'
  | 'admin'
  | 'clinical_supervisor'
  | 'finance_partner'
  | 'support_agent'
  | 'content_manager'

export type PatientStatus = 'نشط' | 'في خطر' | 'مجمّد' | 'غير ملتزم'
export type Screen =
  | 'dashboard'
  | 'patients'
  | 'patient-profile'
  | 'therapists'
  | 'clinical'
  | 'payments'
  | 'programs'
  | 'doc-requests'
  | 'red-flags'
  | 'reports'
  | 'audit'
  | 'settings'
  | 'tickets'
  | 'faqs'
  | 'users'

export interface Patient {
  id: string
  name: string
  therapistId: string
  status: PatientStatus
  subscription: string
  progress: number
  compliance: number
  lastActivity: string
  needsReport?: boolean
}

export interface Payment {
  id: string
  patientId: string
  patientName: string
  amount: number
  plan: string
  date: string
  receipt: string
  status: 'قيد المراجعة' | 'تحت المراجعة' | 'تمت الموافقة' | 'مرفوض'
  partner?: boolean
}

export interface RedFlag {
  id: string
  patientId: string
  patientName: string
  patientWhatsapp?: string | null
  type: string
  source?: string | null
  priority: string
  status: 'open' | 'assigned' | 'resolved'
  assignedTo?: string | null
  assigneeName: string | null
  therapistName: string | null
  reason: string
  assessmentScore: number | null
  onHold: boolean
  allowedDecisions: Array<'reactivate' | 'keep_hold' | 'close'>
  holdSince: string | null
  reactivationRequestedAt: string | null
  actionTaken: string | null
  detectedAt: string
}

export interface AuditEntry {
  time: string
  user: string
  userRole: string
  action: string
  target: string
  details: string
  ip: string
}

export interface DocRequest {
  id: string
  subject: string
  reason: string
  requestedBy: string
  recipient?: string
  date: string
  status: 'requested' | 'submitted' | 'approved' | 'rejected' | 'unknown'
  hasFile?: boolean
  downloadPath?: string
  filename?: string
  reviewNote?: string
}

export interface Ticket {
  id: string
  title: string
  openedBy: string
  priority: 'عالية' | 'متوسطة' | 'منخفضة'
  status: 'مفتوحة' | 'قيد المعالجة' | 'مغلقة'
  date: string
}

export interface Program {
  id: string
  title: string
  kind: 'أساسي' | 'اختياري' | 'محتوى عام'
  modules: number
  therapeutic: boolean
  status: 'منشور' | 'مسودة' | 'مؤرشف'
}

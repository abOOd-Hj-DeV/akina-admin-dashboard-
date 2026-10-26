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

export interface Therapist {
  id: string
  name: string
  status: 'معتمد' | 'قيد المراجعة' | 'معلّق' | 'معطّل'
  patients: number
  rating?: number
  ratingCount?: number
  joined: string
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
  therapistName: string
  reason: string
  level: 'حرج' | 'عالي' | 'متوسط' | 'تم الحل'
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
  date: string
  status: 'قيد المراجعة' | 'مقبول' | 'مرفوض'
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

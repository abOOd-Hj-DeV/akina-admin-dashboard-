/** أنواع عقد الباك اند حسب sakina-api-reference (Laravel API v1) — snake_case كما يرد */

export type ApiRole =
  | 'patient' | 'therapist' | 'super_admin' | 'admin'
  | 'clinical_supervisor' | 'finance_partner' | 'support_agent' | 'content_manager'

export interface ApiUser {
  id: string
  name: string
  email: string
  role: ApiRole
  whatsapp_number: string
  is_active: boolean
  last_login: string | null
  created_at: string
}

export interface AuthResponse {
  message: string
  user: ApiUser
  access_token: string
  token_type: 'Bearer'
  expires_at: string
  refresh_token: string
  refresh_expires_at: string
}

/** ردّ /auth/login لحسابات الإدارة: يُرسل رمز 2FA عبر واتساب بدل التوكن */
export interface TwoFactorChallenge {
  requires_2fa: true
  message: string
  /** رمز التحدي الذي يربط الباك اند الـOTP به — مطلوب في /login/2fa و/login/2fa/resend */
  login_challenge: string
  challenge_expires_at?: string
  request_reference?: string
}

export interface ApiOverview {
  generated_at: string
  users: { total: number; active: number; pending_deletion: number; by_role: Record<ApiRole, number> }
  patients: { total: number; with_therapist: number; safety_flagged: number; by_compliance: Record<'high' | 'medium' | 'low', number> }
  therapists: { by_approval: Record<'pending' | 'approved' | 'rejected', number>; at_capacity: number }
  sessions: {
    today: Record<'pending' | 'confirmed' | 'completed' | 'cancelled', number>
    next_7_days: number; awaiting_confirmation: number; reschedule_requests: number; completed_last_30_days: number
  }
  clinical: { open_red_flags: Record<'high' | 'medium' | 'low', number>; unassigned_red_flags: number; pending_therapist_switches: number }
  billing: {
    pending_payments: number; pending_payments_amount: string; approved_last_30_days_amount: string
    active_subscriptions: number; pending_withdrawals: number; pending_withdrawals_amount: string
  }
  notifications_last_24h: { by_status: Record<'queued' | 'sent' | 'failed' | 'skipped', number>; whatsapp_failed: number }
}

export interface ApiAdminPatient {
  id: string
  full_name: string
  email: string
  whatsapp_number: string
  is_active: boolean
  deletion_scheduled_at: string | null
  last_login: string | null
  joined_at: string
  safety_flag: boolean
  compliance_level: 'high' | 'medium' | 'low'
  therapist: { id: string; full_name: string } | null
  upcoming_sessions_count: number
}

export interface ApiAdminPatientDetail extends ApiAdminPatient {
  // يتوسع حسب رد GET /admin/patients/{id} — بدون المحتوى السريري حسب اختبار المرجعية
  sessions_count?: number
  subscription?: { status: string; package?: string } | null
}

export interface ApiPayment {
  id: string
  subscription_id: string
  therapy_session_id: string | null
  patient_id: string
  patient_name: string
  amount: string
  status: 'pending' | 'approved' | 'rejected'
  note: string | null
  reviewer_id: string | null
  reviewed_at: string | null
  proof_file_path: string | null
  created_at: string
}

export interface ApiRedFlag {
  id: string
  patient_id: string
  type: 'safety' | string
  priority: 'high' | 'medium' | 'low'
  status: 'open' | 'assigned' | 'resolved' | string
  description: string
  action_taken: string | null
  assigned_to: string | null
  assessment_id: string | null
  previous_flag_id: string | null
  created_at: string
  updated_at: string
}

export interface ApiRedFlagStats {
  total: number; open: number; resolved: number; high_priority: number; by_type: Record<string, number>
}

export interface ApiAdminTherapist {
  id: string
  full_name: string
  email: string
  approval_status: 'pending' | 'approved' | 'rejected'
  clients_count: number
  clients_limit?: number | null
  rating?: number | null
  is_active: boolean
  joined_at?: string
}

/** SupportService::toArray — لا priority ولا requester؛ النوع type والمُرسل user */
export interface ApiSupportTicket {
  id: string
  user_id: string
  type: 'technical' | 'billing' | 'clinical' | 'other' | string
  subject: string
  description: string
  has_attachment: boolean
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | string
  assigned_to: string | null
  created_at: string
  updated_at: string
  user?: { id: string; name: string; role?: ApiRole } | null
  replies?: { id: string; body: string; sender_id: string; created_at: string }[]
}

/** DocumentRequestService::toArray (staff view) */
export interface ApiDocument {
  id: string
  doc_type: string
  status: 'requested' | 'submitted' | 'approved' | 'rejected' | string
  reason?: string | null
  review_note?: string | null
  has_file: boolean
  original_name?: string | null
  download_url?: string | null
  requested_at: string
  submitted_at?: string | null
  reviewed_at?: string | null
  user_id: string
  user_name?: string | null
  requested_by?: string | null
  requested_by_name?: string | null
}

export interface ApiFaq {
  id: string
  question: string
  answer: string
  sort_order?: number
  is_active?: boolean
}

/** WalletService::serializeWithdrawal — يرجع therapist_id فقط بدون كائن معالج */
export interface ApiWithdrawal {
  id: string
  therapist_id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'paid' | string
  payout_details?: unknown
  note?: string | null
  reviewed_at?: string | null
  created_at: string
}

/** AuditLogController — timestamp/entity_id/details/actor */
export interface ApiAuditEntry {
  id: string
  action: string
  entity_id?: string | null
  details?: unknown
  timestamp: string | null
  actor?: { id: string | null; name: string | null; role: ApiRole | null }
}

/** ProgramService::serialize — name/is_core بدون status */
export interface ApiProgram {
  id: string
  name: string
  description?: string
  is_core: boolean
  modules_count?: number
  created_at?: string
  updated_at?: string
}

export interface ApiAdminUser {
  id: string
  name: string
  email: string
  whatsapp_number?: string
  role: ApiRole
  is_active: boolean
  created_at: string
}

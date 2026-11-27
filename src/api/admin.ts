/** دوال endpoints الإدارة — /api/v1/admin/* حسب مرجعية الـAPI */
import { api } from './client'
import type { LaravelPaginator, Page } from './client'
import type {
  ApiAdminPatient, ApiAdminPatientDetail, ApiAdminTherapist, ApiAdminTherapistDetail, ApiAdminUser,
  ApiAuditEntry, ApiDocument, ApiFaq, ApiOverview, ApiPayment,
  ApiProgram, ApiRedFlag, ApiRedFlagCounts, ApiRedFlagStats, ApiSupportTicket, ApiWithdrawal, CreateUserBody,
  DocumentType, TherapistFilter, TherapistOptions,
} from './types'

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const adminApi = {
  // نظرة عامة — admin, super_admin
  overview: () => api.get<{ data: ApiOverview }>('/api/v1/admin/overview'),
  notifications: () => api.get<Page<unknown>>('/api/v1/admin/notifications'),

  // المرضى — admin, super_admin, clinical_supervisor
  patients: (f: { search?: string; therapist_id?: string; unassigned?: boolean; safety_flag?: boolean; compliance_level?: string; is_active?: boolean; page?: number } = {}) =>
    api.get<Page<ApiAdminPatient>>(`/api/v1/admin/patients${qs(f)}`),
  patient: (id: string) => api.get<{ data: ApiAdminPatientDetail }>(`/api/v1/admin/patients/${id}`),

  therapists: (f: { status: TherapistFilter; q?: string; page: number; per_page?: number }) =>
    api.get<Required<Page<ApiAdminTherapist>>>(`/api/v1/admin/therapists${qs(f)}`),
  therapist: (id: string) => api.get<{ data: ApiAdminTherapistDetail }>(`/api/v1/admin/therapists/${id}`),
  therapistLicense: (id: string) => api.getBlob(`/api/v1/admin/therapists/${id}/license`),
  therapistOptions: () => api.get<{ data: TherapistOptions }>('/api/v1/meta/therapist-options'),
  approveTherapist: (id: string, body: { revision_id: string; note?: string }) =>
    api.post(`/api/v1/admin/therapists/${id}/approve`, body, false),
  rejectTherapist: (id: string, body: { revision_id: string; note: string }) =>
    api.post(`/api/v1/admin/therapists/${id}/reject`, body, false),
  setClientsLimit: (id: string, clients_limit: number) =>
    api.put(`/api/v1/admin/therapists/${id}/clients-limit`, { clients_limit }),

  // المدفوعات — + finance_partner
  payments: (page?: number) => api.get<Page<ApiPayment>>(`/api/v1/admin/payments${qs({ page })}`),
  reviewPayment: (id: string, action: 'approve' | 'reject', note?: string) =>
    api.post(`/api/v1/admin/payments/${id}/review`, { action, note }),

  // السحوبات — + finance_partner
  withdrawals: (page?: number) => api.get<Page<ApiWithdrawal>>(`/api/v1/admin/withdrawals${qs({ page })}`),
  reviewWithdrawal: (id: string, action: 'approve' | 'reject', note?: string) =>
    api.post(`/api/v1/admin/withdrawals/${id}/review`, { action, note }),

  // الرايات الحمراء — + clinical_supervisor
  redFlags: (f: { status?: string; priority?: string; type?: string; page?: number } = {}) =>
    api.get<Page<ApiRedFlag> & { stats?: ApiRedFlagStats }>(`/api/v1/admin/red-flags${qs(f)}`),
  redFlag: (id: string) => api.get<{ data: ApiRedFlag }>(`/api/v1/admin/red-flags/${id}`),
  redFlagCounts: () => api.get<{ data: ApiRedFlagCounts }>('/api/v1/admin/red-flags/stats'),
  decideRedFlag: (
    id: string,
    body: { decision: 'reactivate' | 'keep_hold' | 'close'; note: string },
  ) => api.post<{ message: string; data: ApiRedFlag }>(`/api/v1/admin/red-flags/${id}/decision`, body),

  // البرامج — + clinical_supervisor
  programs: (f: { page?: number } = {}) => api.get<Page<ApiProgram>>(`/api/v1/admin/programs${qs(f)}`),
  createProgram: (body: { name: string; description: string; is_core?: boolean }) =>
    api.post<{ message: string; program: ApiProgram }>('/api/v1/admin/programs', body),
  updateProgram: (id: string, body: Partial<{ name: string; description: string; is_core: boolean }>) =>
    api.put<{ message: string; program: ApiProgram }>(`/api/v1/admin/programs/${id}`, body),
  deleteProgram: (id: string) => api.del(`/api/v1/admin/programs/${id}`),
  packages: () => api.get<Page<unknown>>('/api/v1/admin/packages'),

  // طلبات الملفات — admin, super_admin فقط
  documents: (page?: number) => api.get<Page<ApiDocument>>(`/api/v1/admin/documents${qs({ page })}`),
  document: (id: string) => api.get<{ data: ApiDocument }>(`/api/v1/admin/documents/${id}`),
  requestDocument: (body: { user_id: string; doc_type: DocumentType; reason?: string }) =>
    api.post<{ data: ApiDocument }>('/api/v1/admin/documents', body),
  reviewDocument: (id: string, action: 'approve' | 'reject', note?: string) =>
    api.post(`/api/v1/admin/documents/${id}/review`, { action, note }),

  // الدعم — + clinical_supervisor, support_agent
  // الباك اند يرجع paginator لارافيل كامل داخل data (data.data = الصفوف)
  tickets: (f: { status?: string; page?: number } = {}) =>
    api.get<{ data: LaravelPaginator<ApiSupportTicket> }>(`/api/v1/admin/support${qs(f)}`),
  ticket: (id: string) => api.get<{ data: ApiSupportTicket }>(`/api/v1/admin/support/${id}`),
  assignTicket: (id: string, assigned_to: string) =>
    api.post(`/api/v1/admin/support/${id}/assign`, { assigned_to }),
  replyTicket: (id: string, body: string) =>
    api.post(`/api/v1/admin/support/${id}/replies`, { body }),
  setTicketStatus: (id: string, status: string) =>
    api.post(`/api/v1/admin/support/${id}/status`, { status }),

  // تبديل المعالج — + clinical_supervisor
  therapistSwitches: () => api.get<Page<unknown>>('/api/v1/admin/therapist-switches'),
  reviewSwitch: (id: string, action: 'approve' | 'reject', note?: string) =>
    api.post(`/api/v1/admin/therapist-switches/${id}/review`, { action, note }),

  // الأسئلة الشائعة — + content_manager
  faqs: (f: { page?: number } = {}) => api.get<Page<ApiFaq>>(`/api/v1/admin/faqs${qs(f)}`),
  createFaq: (body: { question: string; answer: string; sort_order?: number }) => api.post('/api/v1/admin/faqs', body),
  updateFaq: (id: string, body: Partial<{ question: string; answer: string; sort_order: number }>) =>
    api.put(`/api/v1/admin/faqs/${id}`, body),
  deleteFaq: (id: string) => api.del(`/api/v1/admin/faqs/${id}`),

  // المستخدمون — + clinical_supervisor
  users: (f: { role?: string; search?: string; page?: number } = {}) =>
    api.get<LaravelPaginator<ApiAdminUser>>(`/api/v1/admin/users${qs(f)}`),
  createUser: (body: CreateUserBody) =>
    api.post<{ message: string; user: ApiAdminUser; invitation_expires_at: string }>('/api/v1/admin/users', body),
  setUserActive: (id: string, is_active: boolean) =>
    api.patch(`/api/v1/admin/users/${id}/active`, { is_active }),
  resendInvitation: (id: string) => api.post(`/api/v1/admin/users/${id}/invitation/resend`),
  cancelInvitation: (id: string) => api.del(`/api/v1/admin/users/${id}/invitation`),

  // السجل — admin, super_admin
  audit: (f: { action?: string; actor_id?: string; page?: number } = {}) =>
    api.get<Page<ApiAuditEntry>>(`/api/v1/admin/audit${qs(f)}`),
}

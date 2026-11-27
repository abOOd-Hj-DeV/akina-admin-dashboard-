import type { AuditEntry, DocRequest, Patient, Payment, Program, RedFlag, Ticket } from '../types'
import type { ApiAdminTherapistDetail, TherapistActionCode, TherapistLifecycle, TherapistProfile } from '../api/types'
import { ApiError } from '../api/client'

export const patients: Patient[] = [
  { id: 'P-1247', name: 'أحمد م.', therapistId: 'T-042', status: 'نشط', subscription: 'باقة 8 أسابيع', progress: 40, compliance: 85, lastActivity: 'منذ ساعة' },
  { id: 'P-1189', name: 'فاطمة ع.', therapistId: 'T-089', status: 'نشط', subscription: 'باقة 4 أسابيع', progress: 75, compliance: 92, lastActivity: 'منذ 3 ساعات' },
  { id: 'P-1156', name: 'محمد ي.', therapistId: 'T-124', status: 'في خطر', subscription: 'باقة 8 أسابيع', progress: 25, compliance: 45, lastActivity: 'منذ يومين', needsReport: true },
  { id: 'P-1134', name: 'خالد س.', therapistId: 'T-042', status: 'في خطر', subscription: 'باقة 8 أسابيع', progress: 30, compliance: 52, lastActivity: 'منذ 5 ساعات', needsReport: true },
  { id: 'P-1102', name: 'سارة ر.', therapistId: 'T-089', status: 'غير ملتزم', subscription: 'باقة 4 أسابيع', progress: 55, compliance: 38, lastActivity: 'منذ 4 أيام' },
  { id: 'P-1098', name: 'عمر ت.', therapistId: 'T-042', status: 'نشط', subscription: 'باقة 8 أسابيع', progress: 62, compliance: 78, lastActivity: 'منذ 20 دقيقة' },
  { id: 'P-1071', name: 'ليان ك.', therapistId: 'T-124', status: 'مجمّد', subscription: 'باقة 4 أسابيع', progress: 15, compliance: 20, lastActivity: 'منذ أسبوع' },
  { id: 'P-1044', name: 'يوسف ن.', therapistId: 'T-089', status: 'نشط', subscription: 'باقة 8 أسابيع', progress: 88, compliance: 95, lastActivity: 'منذ ساعتين' },
]

export const mockLifecycleActions: Record<TherapistLifecycle, TherapistActionCode[]> = {
  invited: ['resend_invite', 'cancel_invite'],
  awaiting_profile: ['suspend'],
  pending_review: ['approve', 'reject', 'suspend'],
  needs_changes: ['suspend'],
  approved: ['suspend'],
  update_pending: ['approve', 'reject', 'suspend'],
  suspended: ['reactivate'],
}

type MockTherapist = Pick<ApiAdminTherapistDetail, 'id' | 'full_name' | 'approval_status' | 'created_at'> &
  Partial<ApiAdminTherapistDetail> & { lifecycle_state: TherapistLifecycle }

export function mockTherapist(row: MockTherapist): ApiAdminTherapistDetail {
  const approved = row.approval_status === 'approved'
  const published = {
    full_name: row.full_name, job_title: approved ? 'معالج نفسي معتمد' : null,
    specialty: approved ? 'anxiety' : null, bio: approved ? 'أقدّم الدعم النفسي للبالغين وأساعدهم على إدارة القلق.' : null,
    email: null, city: approved ? 'دمشق' : null, country: approved ? 'SY' : null,
    languages: approved ? ['ar', 'en'] : [], years_of_experience: approved ? 5 : null,
    ...row.published,
  }
  return {
    ...published,
    rating: null, review_count: 0, can_accept_new_clients: true,
    availability: { monday: ['09:00-12:00'] }, clients_count: 0, clients_limit: 20, is_active: true,
    whatsapp_number: null, application_ref: null, approval_note: null, submitted_at: null,
    pending_revision: null, last_review: null, last_rejected_revision: null,
    activated: row.lifecycle_state !== 'invited',
    allowed_actions: mockLifecycleActions[row.lifecycle_state],
    ...row,
    published,
  }
}

const initialProfile: TherapistProfile = {
  full_name: 'د. نور حسن', job_title: 'معالج نفسي معتمد', specialty: 'anxiety', country: 'SY',
  city: 'حلب', email: 'therapist-initial@example.test', languages: ['ar'], years_of_experience: 0,
  bio: 'أعمل على دعم البالغين وتطوير مهارات التعامل مع القلق.',
}
const updateDemo = mockTherapist({
  id: 'T-042', full_name: 'د. سارة أحمد', lifecycle_state: 'update_pending', approval_status: 'approved', clients_count: 18, rating: 4.9, review_count: 18,
  application_ref: 'APP-1001', created_at: '2024-03-15T09:00:00Z',
})
updateDemo.pending_revision = {
  id: '8cf7762e-2108-46ef-88ac-36416159391e', kind: 'update', status: 'pending', submitted_at: '2025-11-21T09:00:00Z',
  data: { ...updateDemo.published, city: 'حلب', years_of_experience: 6 },
  changes: { city: { old: 'دمشق', new: 'حلب' }, years_of_experience: { old: 5, new: 6 } },
}

export const therapists = [
  updateDemo,
  mockTherapist({ id: 'T-089', full_name: 'د. محمد الخالدي', lifecycle_state: 'approved', approval_status: 'approved', clients_count: 15, rating: 4.8, review_count: 15, created_at: '2024-06-20T09:00:00Z' }),
  mockTherapist({
    id: 'T-124', full_name: 'د. نور حسن', lifecycle_state: 'pending_review', approval_status: 'pending', created_at: '2025-11-16T09:00:00Z',
    application_ref: 'APP-1002', whatsapp_number: '+12025550101', submitted_at: '2025-11-22T09:00:00Z',
    pending_revision: {
      id: '9e1a8253-057a-4bdb-9c31-3c2eb1f64a0b', kind: 'initial', status: 'pending',
      submitted_at: '2025-11-22T09:00:00Z', data: initialProfile,
    },
  }),
  mockTherapist({ id: 'T-097', full_name: 'د. ليلى منصور', lifecycle_state: 'suspended', approval_status: 'approved', clients_count: 12, rating: 4.7, review_count: 12, is_active: false, created_at: '2024-09-02T09:00:00Z' }),
  mockTherapist({
    id: 'T-133', full_name: 'د. هشام فؤاد', lifecycle_state: 'needs_changes', approval_status: 'rejected',
    approval_note: 'تفاصيل الملف لا تطابق طلب التقديم.', created_at: '2024-12-11T09:00:00Z',
    last_rejected_revision: {
      id: 'rejected-initial', kind: 'initial', status: 'rejected', submitted_at: '2024-12-12T09:00:00Z',
      reviewed_at: '2024-12-13T09:00:00Z', review_note: 'تفاصيل الملف لا تطابق طلب التقديم.',
      data: { ...initialProfile, full_name: 'د. هشام فؤاد', email: 'therapist-rejected@example.test' },
    },
  }),
  mockTherapist({ id: 'T-134', full_name: 'د. ريم محمود', lifecycle_state: 'awaiting_profile', approval_status: null, created_at: '2025-11-19T09:00:00Z' }),
  mockTherapist({ id: 'T-135', full_name: 'د. مريم علي', lifecycle_state: 'invited', approval_status: null, is_active: false, application_ref: 'APP-1003', created_at: '2025-11-23T09:00:00Z' }),
]

export const payments: Payment[] = [
  { id: 'PAY-8947', patientId: 'P-1247', patientName: 'أحمد م.', amount: 2200, plan: 'باقة 8 أسابيع', date: '2025-11-18 09:15', receipt: 'receipt-8947.jpg', status: 'قيد المراجعة', partner: true },
  { id: 'PAY-8946', patientId: 'P-1189', patientName: 'فاطمة ع.', amount: 1200, plan: 'باقة 4 أسابيع', date: '2025-11-18 08:42', receipt: 'receipt-8946.jpg', status: 'قيد المراجعة' },
  { id: 'PAY-8945', patientId: 'P-1156', patientName: 'محمد ي.', amount: 2200, plan: 'باقة 8 أسابيع', date: '2025-11-17 22:18', receipt: 'receipt-8945.jpg', status: 'تحت المراجعة' },
  { id: 'PAY-8938', patientId: 'P-1134', patientName: 'خالد س.', amount: 2200, plan: 'باقة 8 أسابيع', date: '2025-11-17 18:05', receipt: 'receipt-8938.jpg', status: 'تمت الموافقة', partner: true },
  { id: 'PAY-8929', patientId: 'P-1102', patientName: 'سارة ر.', amount: 1200, plan: 'باقة 4 أسابيع', date: '2025-11-17 14:31', receipt: 'receipt-8929.jpg', status: 'مرفوض' },
]

export const redFlags: RedFlag[] = [
  {
    id: 'RF-047',
    patientId: 'P-1156',
    patientName: 'محمد ي.',
    patientWhatsapp: '+963944123456',
    type: 'safety',
    priority: 'high',
    status: 'open',
    assignedTo: 'staff-1',
    assigneeName: 'د. سارة أحمد',
    therapistName: 'د. نور حسن',
    reason: 'أشار المريض في السؤال التاسع من PHQ-9 إلى أفكار لإيذاء النفس.',
    level: 'حرج',
    assessmentScore: 27,
    onHold: true,
    holdSince: '2026-04-18T07:10:00.000Z',
    reactivationRequestedAt: '2026-04-18T07:32:00.000Z',
    actionTaken: 'د. سارة أحمد — 2026-04-18T07:25:00.000Z: تمت مراجعة الخطة الأولية.',
    detectedAt: '2026-04-18T07:00:00.000Z',
  },
  {
    id: 'RF-046',
    patientId: 'P-1134',
    patientName: 'خالد س.',
    patientWhatsapp: '+963944654321',
    type: 'low_mood',
    priority: 'medium',
    status: 'open',
    assignedTo: null,
    assigneeName: null,
    therapistName: 'د. سارة أحمد',
    reason: 'درجة PHQ-9 مرتفعة.',
    level: 'عالي',
    assessmentScore: 18,
    onHold: false,
    holdSince: null,
    reactivationRequestedAt: null,
    actionTaken: null,
    detectedAt: '2026-04-17T15:15:00.000Z',
  },
  {
    id: 'RF-043',
    patientId: 'P-1102',
    patientName: 'سارة ر.',
    patientWhatsapp: null,
    type: 'non_compliance',
    priority: 'low',
    status: 'open',
    assignedTo: null,
    assigneeName: null,
    therapistName: null,
    reason: 'عدم الالتزام بالخطة العلاجية.',
    level: 'متوسط',
    assessmentScore: null,
    onHold: false,
    holdSince: null,
    reactivationRequestedAt: null,
    actionTaken: null,
    detectedAt: '2026-04-16T19:40:00.000Z',
  },
]

export function applyRedFlagDecision(
  id: string,
  decision: 'reactivate' | 'keep_hold' | 'close',
  note: string,
): RedFlag {
  const flag = redFlags.find(item => item.id === id)
  if (!flag) throw new Error('الحالة غير متاحة.')
  if (flag.status === 'resolved') {
    throw new ApiError(409, 'الحالة محلولة ولا يمكن اتخاذ قرار جديد.', undefined, 'decision_not_applicable')
  }

  flag.actionTaken = [flag.actionTaken, note].filter(Boolean).join('\n\n')
  if (decision === 'reactivate' || decision === 'close') {
    flag.status = 'resolved'
    flag.level = 'تم الحل'
  }
  if (decision === 'reactivate') {
    flag.onHold = false
    flag.holdSince = null
  }
  if (decision !== 'close') flag.reactivationRequestedAt = null
  return flag
}

export const auditLog: AuditEntry[] = [
  { time: '2025-11-18 09:42:15', user: 'admin@platform.com', userRole: 'Super Admin', action: 'تعديل صلاحيات', target: 'User: support@platform.com', details: 'تغيير الدور من Support Agent إلى Admin', ip: '192.168.1.45' },
  { time: '2025-11-18 09:15:32', user: 'finance@platform.com', userRole: 'Admin', action: 'الموافقة على دفعة', target: 'Payment: PAY-8947', details: 'تمت الموافقة على حوالة بمبلغ 2200 ر.س', ip: '192.168.1.23' },
  { time: '2025-11-18 08:47:18', user: 'clinical@platform.com', userRole: 'Clinical Supervisor', action: 'عرض ملف مريض', target: 'Patient: P-1156', details: 'دخول إلى ملف المريض محمد ي.', ip: '192.168.1.67' },
  { time: '2025-11-18 07:32:08', user: 'SYSTEM', userRole: 'System', action: 'تنبيه تلقائي', target: 'Red Flag: RF-047', details: 'رصد انخفاض حاد في مزاج المريض P-1156', ip: 'AUTO' },
  { time: '2025-11-17 22:18:45', user: 'admin@platform.com', userRole: 'Super Admin', action: 'حذف محتوى', target: 'Program: PM-012', details: 'حذف وحدة تعليمية قديمة', ip: '192.168.1.45' },
  { time: '2025-11-17 19:03:52', user: 'support@platform.com', userRole: 'Support Agent', action: 'تعليق حساب', target: 'User: patient-77', details: 'تعليق مؤقت بناءً على طلب المستخدم', ip: '192.168.1.88' },
]

export const docRequests: DocRequest[] = [
  { id: 'DR-021', subject: 'شهادة', reason: 'توثيق مؤهل إضافي', requestedBy: 'عرض تجريبي', date: '2025-11-18', status: 'requested' },
  { id: 'DR-019', subject: 'ملف داعم', reason: 'استكمال طلب سابق', requestedBy: 'عرض تجريبي', date: '2025-11-17', status: 'submitted', hasFile: true },
  { id: 'DR-014', subject: 'إثبات هوية', reason: 'التحقق من البيانات', requestedBy: 'عرض تجريبي', date: '2025-11-16', status: 'approved' },
  { id: 'DR-011', subject: 'شهادة', reason: 'توثيق مؤهل إضافي', requestedBy: 'عرض تجريبي', date: '2025-11-15', status: 'rejected' },
]

export const tickets: Ticket[] = [
  { id: 'TK-331', title: 'مشكلة في رفع الإيصال داخل التطبيق', openedBy: 'مريض P-1189', priority: 'عالية', status: 'مفتوحة', date: '2025-11-18 08:10' },
  { id: 'TK-328', title: 'تعذّر تسجيل الدخول — رمز OTP لا يصل', openedBy: 'مريض P-1098', priority: 'متوسطة', status: 'قيد المعالجة', date: '2025-11-17 23:44' },
  { id: 'TK-315', title: 'استفسار عن سياسة إلغاء الاشتراك', openedBy: 'معالج T-097', priority: 'منخفضة', status: 'مغلقة', date: '2025-11-16 12:20' },
  { id: 'TK-309', title: 'بلاغ عن خلل في شاشة المزاج', openedBy: 'مريض P-1156', priority: 'عالية', status: 'قيد المعالجة', date: '2025-11-15 19:05' },
]

export const programs: Program[] = [
  { id: 'PR-01', title: 'برنامج إدارة القلق العام', kind: 'أساسي', modules: 8, therapeutic: true, status: 'منشور' },
  { id: 'PR-02', title: 'برنامج علاج الاكتئاب المعرفي', kind: 'أساسي', modules: 10, therapeutic: true, status: 'منشور' },
  { id: 'PR-03', title: 'وحدات النوم والاسترخاء', kind: 'اختياري', modules: 5, therapeutic: true, status: 'منشور' },
  { id: 'PR-04', title: 'مكتبة الوعي النفسي العام', kind: 'محتوى عام', modules: 14, therapeutic: false, status: 'منشور' },
  { id: 'PR-05', title: 'فيديوهات دعم الأهل', kind: 'محتوى عام', modules: 6, therapeutic: false, status: 'مسودة' },
]

export const activityFeed = [
  { text: 'مريض جديد سجل في المنصة', by: 'عبداللطيف الغامدي', at: 'منذ دقيقتين', dot: '#22c55e' },
  { text: 'تمت الموافقة على حوالة بنكية', by: 'Admin1', at: 'منذ 5 دقائق', dot: '#3b82f6' },
  { text: 'تم تغيير معالج مريض', by: 'ClinicalSuper2', at: 'منذ 12 دقيقة', dot: '#a855f7' },
  { text: 'تنبيه: مريض لم يسجل مراجعة منذ 5 أيام', by: 'د. طارق', at: 'منذ 23 دقيقة', dot: '#f59e0b' },
  { text: 'تم رفض حوالة بنكية (صورة غير واضحة)', by: 'Finance1', at: 'منذ 40 دقيقة', dot: '#ef4444' },
]

import type { ApiAdminTherapist, TherapistActionCode, TherapistLifecycle } from '../api/types'
import { canDecideTherapist } from '../auth/permissions'
import type { Role } from '../types'

type Tone = 'gray' | 'blue' | 'amber' | 'green' | 'red'
type LifecycleCopy = { label: string; next: string; tone: Tone }

export const THERAPIST_LIFECYCLE: Record<TherapistLifecycle, LifecycleCopy> = {
  invited: { label: 'بانتظار تفعيل الدعوة', next: 'بانتظار تأكيد رقم واتساب من المعالج.', tone: 'blue' },
  awaiting_profile: { label: 'بانتظار الملف المهني', next: 'بانتظار أن يُرسل المعالج ملفه المهني.', tone: 'gray' },
  pending_review: { label: 'قيد المراجعة', next: 'طابق الملف المُرسل مع طلب التقديم قبل اتخاذ القرار.', tone: 'amber' },
  needs_changes: { label: 'بحاجة إلى تعديل', next: 'بانتظار أن يصحّح المعالج ملفه ويعيد إرساله.', tone: 'red' },
  approved: { label: 'معتمد', next: 'الملف المهني منشور ولا يتطلب مراجعة.', tone: 'green' },
  update_pending: { label: 'تعديلات بانتظار المراجعة', next: 'قارن التعديلات بالملف المنشور قبل اتخاذ القرار.', tone: 'amber' },
  suspended: { label: 'معلّق', next: 'الحساب معلّق ولا يمكن للمعالج استخدامه.', tone: 'red' },
}

export const THERAPIST_ACTIONS = {
  resend_invite: { label: 'إعادة إرسال الدعوة', prompt: 'سيُرسل رمز تفعيل جديد عبر واتساب.', success: 'أُعيد إرسال الدعوة.' },
  cancel_invite: { label: 'إلغاء الدعوة', prompt: 'سيُحذف حساب الدعوة غير المفعّل.', success: 'أُلغيت الدعوة.' },
  approve: { label: 'قبول', prompt: 'سيُنشر الملف المهني كما راجعته.', success: 'تم اعتماد النسخة المُراجعة ونشرها.' },
  reject: { label: 'رفض', prompt: 'سيُرسل سبب الرفض للمعالج، ولن تُنشر هذه النسخة.', success: 'لم تُعتمد النسخة وأُرسل السبب إلى المعالج.' },
  suspend: { label: 'تعليق الحساب', prompt: 'لن يستطيع المعالج استخدام حسابه حتى إعادة تفعيله.', success: 'تم تعليق الحساب.' },
  reactivate: { label: 'إعادة تفعيل الحساب', prompt: 'سيتمكّن المعالج من استخدام حسابه مجددًا.', success: 'أُعيد تفعيل الحساب.' },
} satisfies Record<TherapistActionCode, { label: string; prompt: string; success: string }>

export function lifecycleOf(value: ApiAdminTherapist['lifecycle_state']): TherapistLifecycle | null {
  return value && Object.hasOwn(THERAPIST_LIFECYCLE, value) ? value as TherapistLifecycle : null
}

export function lifecycleCopy(value: ApiAdminTherapist['lifecycle_state']): LifecycleCopy {
  const state = lifecycleOf(value)
  return state ? THERAPIST_LIFECYCLE[state] : { label: 'الحالة غير متاحة', next: 'لا يمكن تنفيذ إجراء على هذه الحالة.', tone: 'gray' }
}

export const isDecision = (action: TherapistActionCode): action is 'approve' | 'reject' => action === 'approve' || action === 'reject'

export function allowedTherapistActions(row: ApiAdminTherapist, role: Role | null) {
  const allowed = row.allowed_actions
  if (!canDecideTherapist(role) || !lifecycleOf(row.lifecycle_state) || !Array.isArray(allowed)) return []
  return (Object.keys(THERAPIST_ACTIONS) as TherapistActionCode[]).filter(action => allowed.includes(action))
}

export function therapistSnapshot(row: ApiAdminTherapist) {
  return JSON.stringify([row.id, lifecycleOf(row.lifecycle_state), row.pending_revision?.id ?? null])
}

export function verificationLabel(row: ApiAdminTherapist) {
  if (typeof row.activated === 'boolean') return row.activated ? 'تم التحقق' : 'لم يتم التحقق'
  if (row.phone_verified_at !== undefined) return row.phone_verified_at ? 'تم التحقق' : 'لم يتم التحقق'
  return lifecycleOf(row.lifecycle_state) === 'invited' ? 'لم يتم التحقق' : 'حالة التحقق غير متاحة'
}

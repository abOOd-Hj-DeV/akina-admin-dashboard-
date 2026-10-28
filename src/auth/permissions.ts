import type { Role, Screen } from '../types'

// مستويات الوصول حسب مصفوفة صلاحيات لوحة الإدارة في وثيقة المنتج:
//   full    — عرض وإجراءات كاملة
//   read    — قراءة فقط
//   limited — وصول مع حجب حقول/إجراءات (القناع في mask)
//   denied  — الشاشة مخفية تماماً (تظهر صفحة غير مصرح)
export type AccessLevel = 'full' | 'read' | 'limited' | 'denied'

export interface Access {
  level: AccessLevel
  /** قناع البيانات عند level=limited أو read: لا يعرض إلا هذا النطاق */
  mask?:
    | 'no-clinical'   // admin: مرضى بدون بيانات سريرية
    | 'no-identity'   // supervisor: بدون هوية المريض
    | 'status-only'   // support: حالة الحساب فقط
    | 'own'           // finance: حوالاته/أرباحه فقط
    | 'non-therapeutic' // content: المحتوى غير العلاجي فقط
    | 'ops'           // admin: تشغيل فقط
    | 'alert'         // support: يرى التنبيه فقط
    | 'escalate'      // support: رفع للمدير
    | 'clinical'      // supervisor: التقارير السريرية فقط
    | 'earnings'      // finance: تقارير أرباحه فقط
}

type Matrix = Record<Role, Partial<Record<Screen, Access>>>

const m = (level: AccessLevel, mask?: Access['mask']): Access => ({ level, mask })

// المصفوفة مطابقة لعقد الباك اند (مرجعية API — الأدوار المسموحة لكل endpoint)
// مع قناع الـPDF للحقول المخفية (مثل هوية المريض للمشرف) على مستوى الواجهة.
export const MATRIX: Matrix = {
  super_admin: {
    dashboard: m('full'), patients: m('full'), 'patient-profile': m('full'),
    therapists: m('full'), clinical: m('read'), payments: m('full'),
    programs: m('full'), 'doc-requests': m('full'), 'red-flags': m('full'),
    reports: m('full'), audit: m('full'), settings: m('full'), tickets: m('full'),
    faqs: m('full'), users: m('full'),
  },
  admin: {
    dashboard: m('limited', 'ops'),
    patients: m('limited', 'no-clinical'), 'patient-profile': m('limited', 'no-clinical'),
    therapists: m('limited', 'ops'),
    payments: m('full'), programs: m('read'), 'doc-requests': m('full'),
    'red-flags': m('limited', 'alert'), reports: m('limited', 'ops'),
    audit: m('read'), tickets: m('read'), faqs: m('full'), users: m('full'),
  },
  clinical_supervisor: {
    dashboard: m('limited', 'clinical'),
    patients: m('limited', 'no-identity'), 'patient-profile': m('limited', 'no-identity'),
    clinical: m('full'), programs: m('full'), 'red-flags': m('full'),
    reports: m('limited', 'clinical'), tickets: m('read'), users: m('full'),
    // الـAPI يمنع: المعالجون، طلبات الملفات → denied
  },
  finance_partner: {
    dashboard: m('limited', 'earnings'),
    payments: m('limited', 'own'), reports: m('limited', 'earnings'),
    // الـAPI يمنحه أيضاً /admin/withdrawals — تُعرض ضمن شاشة المدفوعات
  },
  support_agent: {
    dashboard: m('limited', 'status-only'),
    'red-flags': m('limited', 'alert'), tickets: m('full'),
    // الـAPI يمنع: المرضى، طلبات الملفات، المعالجون → denied
  },
  content_manager: {
    faqs: m('full'),
    // الـAPI يمنحه الأسئلة الشائعة فقط — مكتبة البرامج ممنوعة عنه
  },
}

export const access = (role: Role, screen: Screen): Access =>
  MATRIX[role][screen] ?? { level: 'denied' }

export const canView = (role: Role, screen: Screen) => access(role, screen).level !== 'denied'

/** أول شاشة متاحة للدور — وجهة إعادة التوجيه بعد الدخول ولصفحة غير مصرح */
export const homeFor = (role: Role): Screen => {
  if (role === 'content_manager') return 'faqs'
  return 'dashboard'
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'المدير الرئيسي',
  admin: 'المدير',
  clinical_supervisor: 'المشرف الإكلينيكي',
  finance_partner: 'الشريك المالي',
  support_agent: 'موظف الدعم',
  content_manager: 'مدير المحتوى',
}

export const NAV: { screen: Screen; label: string; icon: string }[] = [
  { screen: 'dashboard', label: 'لوحة التحكم', icon: 'dashboard' },
  { screen: 'patients', label: 'إدارة المرضى', icon: 'users' },
  { screen: 'therapists', label: 'إدارة المعالجين', icon: 'stetho' },
  { screen: 'payments', label: 'مراجعة المدفوعات', icon: 'card' },
  { screen: 'clinical', label: 'الإشراف الإكلينيكي', icon: 'clinical' },
  { screen: 'red-flags', label: 'التصعيد (Red Flags)', icon: 'flag' },
  { screen: 'programs', label: 'مكتبة البرامج', icon: 'book' },
  { screen: 'doc-requests', label: 'طلبات الملفات', icon: 'file' },
  { screen: 'reports', label: 'التقارير', icon: 'chart' },
  { screen: 'tickets', label: 'الدعم الفني', icon: 'ticket' },
  { screen: 'faqs', label: 'الأسئلة الشائعة', icon: 'list' },
  { screen: 'users', label: 'إدارة المستخدمين', icon: 'users' },
  { screen: 'audit', label: 'سجل التدقيق', icon: 'shield' },
  { screen: 'settings', label: 'الإعدادات', icon: 'gear' },
]

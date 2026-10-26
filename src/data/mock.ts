import type { AuditEntry, DocRequest, Patient, Payment, Program, RedFlag, Therapist, Ticket } from '../types'

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

export const therapists: Therapist[] = [
  { id: 'T-042', name: 'د. سارة أحمد', status: 'معتمد', patients: 18, rating: 4.9, ratingCount: 127, joined: '2024-03-15' },
  { id: 'T-089', name: 'د. محمد الخالدي', status: 'معتمد', patients: 15, rating: 4.8, ratingCount: 95, joined: '2024-06-20' },
  { id: 'T-124', name: 'د. نور حسن', status: 'قيد المراجعة', patients: 0, joined: '2025-11-16' },
  { id: 'T-097', name: 'د. ليلى منصور', status: 'معتمد', patients: 12, rating: 4.7, ratingCount: 61, joined: '2024-09-02' },
  { id: 'T-133', name: 'د. هشام فؤاد', status: 'معلّق', patients: 6, rating: 4.2, ratingCount: 33, joined: '2024-12-11' },
]

export const payments: Payment[] = [
  { id: 'PAY-8947', patientId: 'P-1247', patientName: 'أحمد م.', amount: 2200, plan: 'باقة 8 أسابيع', date: '2025-11-18 09:15', receipt: 'receipt-8947.jpg', status: 'قيد المراجعة', partner: true },
  { id: 'PAY-8946', patientId: 'P-1189', patientName: 'فاطمة ع.', amount: 1200, plan: 'باقة 4 أسابيع', date: '2025-11-18 08:42', receipt: 'receipt-8946.jpg', status: 'قيد المراجعة' },
  { id: 'PAY-8945', patientId: 'P-1156', patientName: 'محمد ي.', amount: 2200, plan: 'باقة 8 أسابيع', date: '2025-11-17 22:18', receipt: 'receipt-8945.jpg', status: 'تحت المراجعة' },
  { id: 'PAY-8938', patientId: 'P-1134', patientName: 'خالد س.', amount: 2200, plan: 'باقة 8 أسابيع', date: '2025-11-17 18:05', receipt: 'receipt-8938.jpg', status: 'تمت الموافقة', partner: true },
  { id: 'PAY-8929', patientId: 'P-1102', patientName: 'سارة ر.', amount: 1200, plan: 'باقة 4 أسابيع', date: '2025-11-17 14:31', receipt: 'receipt-8929.jpg', status: 'مرفوض' },
]

export const redFlags: RedFlag[] = [
  { id: 'RF-047', patientId: 'P-1156', patientName: 'محمد ي.', therapistName: 'د. نور حسن', reason: 'انخفاض حاد في تسجيل المزاج (من 7 إلى 2 في 3 أيام)', level: 'عالي', detectedAt: '07:32 18-11-2025' },
  { id: 'RF-046', patientId: 'P-1134', patientName: 'خالد س.', therapistName: 'د. سارة أحمد', reason: 'ذكر أفكار إيذاء النفس في رسالة للمعالج', level: 'حرج', detectedAt: '06:15 18-11-2025' },
  { id: 'RF-043', patientId: 'P-1102', patientName: 'سارة ر.', therapistName: 'د. محمد الخالدي', reason: 'عدم حضور 3 جلسات متتالية مع تقييد التواصل', level: 'متوسط', detectedAt: '21:40 17-11-2025' },
  { id: 'RF-039', patientId: 'P-1044', patientName: 'يوسف ن.', therapistName: 'د. محمد الخالدي', reason: 'تنبيه مزاج منخفض — تمت المعالجة وإغلاق الحالة', level: 'تم الحل', detectedAt: '10:05 16-11-2025' },
]

export const auditLog: AuditEntry[] = [
  { time: '2025-11-18 09:42:15', user: 'admin@platform.com', userRole: 'Super Admin', action: 'تعديل صلاحيات', target: 'User: support@platform.com', details: 'تغيير الدور من Support Agent إلى Admin', ip: '192.168.1.45' },
  { time: '2025-11-18 09:15:32', user: 'finance@platform.com', userRole: 'Admin', action: 'الموافقة على دفعة', target: 'Payment: PAY-8947', details: 'تمت الموافقة على حوالة بمبلغ 2200 ر.س', ip: '192.168.1.23' },
  { time: '2025-11-18 08:47:18', user: 'clinical@platform.com', userRole: 'Clinical Supervisor', action: 'عرض ملف مريض', target: 'Patient: P-1156', details: 'دخول إلى ملف المريض محمد ي.', ip: '192.168.1.67' },
  { time: '2025-11-18 07:32:08', user: 'SYSTEM', userRole: 'System', action: 'تنبيه تلقائي', target: 'Red Flag: RF-047', details: 'رصد انخفاض حاد في مزاج المريض P-1156', ip: 'AUTO' },
  { time: '2025-11-17 22:18:45', user: 'admin@platform.com', userRole: 'Super Admin', action: 'حذف محتوى', target: 'Program: PM-012', details: 'حذف وحدة تعليمية قديمة', ip: '192.168.1.45' },
  { time: '2025-11-17 19:03:52', user: 'support@platform.com', userRole: 'Support Agent', action: 'تعليق حساب', target: 'User: patient-77', details: 'تعليق مؤقت بناءً على طلب المستخدم', ip: '192.168.1.88' },
]

export const docRequests: DocRequest[] = [
  { id: 'DR-021', subject: 'مشاركة ملف المريض P-1156 مع جهة إحالة خارجية', reason: 'إحالة طبية عاجلة — تقرير الحالة مطلوب', requestedBy: 'د. نور حسن', date: '2025-11-18', status: 'قيد المراجعة' },
  { id: 'DR-019', subject: 'طلب تغيير معالج للمريضة فاطمة ع.', reason: 'طلب المريضة — عدم توافق أسلوب العلاج', requestedBy: 'Support', date: '2025-11-17', status: 'قيد المراجعة' },
  { id: 'DR-014', subject: 'مستند هوية للمعالج T-124', reason: 'استكمال اعتماد الترخيص المهني', requestedBy: 'Compliance', date: '2025-11-16', status: 'مقبول' },
  { id: 'DR-011', subject: 'تقرير تقدم شهري للمريض P-1044', reason: 'طلب ولي الأمر', requestedBy: 'Support', date: '2025-11-15', status: 'مرفوض' },
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

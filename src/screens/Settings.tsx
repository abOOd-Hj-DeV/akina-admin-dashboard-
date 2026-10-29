import { Btn, Card, PageHeader } from '../components/ui'
import { API_MOCK } from '../api/client'

const SECTIONS = [
  {
    title: 'العلامة التجارية',
    rows: [['اسم المنصة', 'سكينة — Mental Health Therapy Platform'], ['اللون الأساسي', '#1D919E'], ['لغة الواجهة', 'العربية (RTL)']],
  },
  {
    title: 'نصوص الموافقة',
    rows: [['موافقة العلاج', 'أوافق على تلقي خدمات الصحة النفسية عبر المنصة...'], ['مشاركة البيانات', 'أوافق على مشاركة بياناتي مع المعالج المعيّن...'], ['تحذير الطوارئ', 'في الحالات الحرجة سيتم تحويلك لخدمات الطوارئ...']],
  },
  {
    title: 'معايير التحذير (Red Flags)',
    rows: [['انخفاض المزاج', 'انخفاض ≥ 4 نقاط خلال 3 أيام'], ['عدم الالتزام', 'غياب عن 3 جلسات متتالية'], ['عبارات خطرة', 'كلمات مفتاحية للإيذاء الذاتي في الرسائل'], ['زمن المعالجة', 'إشعار مشرف إن تجاوزت الحالة 24 ساعة']],
  },
  {
    title: 'مكاتب الحوالات',
    rows: [['التحويل البنكي', 'SAIB — IBAN: SA••••••8421'], ['أوقات الاستلام', 'السبت–الخميس 8ص–10م'], ['مدة التحقق المستهدفة', '≤ 12 ساعة']],
  },
  {
    title: 'سياسة البيانات',
    rows: [['فصل الهوية عن السريرية', 'مفعّل — المشرف يرى بلا هوية'], ['مدة الاحتفاظ بالسجلات', '7 سنوات'], ['تصدير بيانات المريض', 'بموافقة المدير الرئيسي فقط']],
  },
]

export default function Settings() {
  return (
    <>
      <PageHeader title="إعدادات النظام" sub="Super Admin فقط — كل تعديل يُسجل في Audit Log" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {SECTIONS.map((s) => (
          <Card key={s.title}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[#0a0a0a]">{s.title}</h3>
              <Btn tone="ghost" className="px-3 py-1.5 text-[12px]">تحرير</Btn>
            </div>
            <div className="divide-y divide-[#eff0f0]">
              {s.rows.map(([k, v]) => (
                /* في الوضع الحي لا نعرض رقم حساب بنكي غير مضبوط من الخادم */
                (s.title === 'مكاتب الحوالات' && !API_MOCK && v.includes('IBAN')) ? (
                  <div key={k} className="flex items-center justify-between gap-4 py-2.5 text-[14px]">
                    <span className="font-medium text-[#657381]">{k}</span>
                    <span className="text-left text-[#657381]">لم يُضبط بعد</span>
                  </div>
                ) : (
                  <div key={k} className="flex items-center justify-between gap-4 py-2.5 text-[14px]">
                    <span className="font-medium text-[#657381]">{k}</span>
                    <span className="text-left text-[#0a0a0a]">{v}</span>
                  </div>
                )
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

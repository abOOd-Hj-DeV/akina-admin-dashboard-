import { useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { patients, redFlags, therapists } from '../data/mock'
import { Badge, Btn, Card, PageHeader, ProgressBar } from '../components/ui'
import Icon from '../components/Icon'

const TABS = ['بيانات الحساب', 'المعالج والبرنامج', 'التقدم العلاجي', 'سجل المزاج', 'الجلسات', 'التحذيرات', 'المستندات']
/** تبويبات سريرية — مخفية عن Admin */
const CLINICAL_TABS = new Set(['التقدم العلاجي', 'سجل المزاج', 'الجلسات', 'التحذيرات'])

const moodLog = [
  { day: 'اليوم', score: 4, note: 'توتر متوسط' },
  { day: 'أمس', score: 3, note: 'قلق قبل الجلسة' },
  { day: 'قبل يومين', score: 5, note: 'مستقر' },
  { day: 'قبل 3 أيام', score: 2, note: 'انخفاض حاد — تنبيه تلقائي' },
]
const sessions = [
  { n: 'الجلسة 5', date: '2025-11-16', status: 'مكتملة', notes: 'تمت مراجعة الواجب وخطة الأسبوع' },
  { n: 'الجلسة 4', date: '2025-11-09', status: 'مكتملة', notes: 'تقنية التنفس + إعادة هيكلة' },
  { n: 'الجلسة 6', date: '2025-11-23', status: 'مجدولة', notes: '—' },
]

export default function PatientProfile() {
  const { role } = useAuth()
  const [params] = useSearchParams()
  const p = patients.find((x) => x.id === params.get('id')) ?? patients[2]
  const a = role ? access(role, 'patient-profile') : { level: 'denied' as const }
  const anon = a.mask === 'no-identity'
  const limited = a.mask === 'no-clinical'
  const full = a.level === 'full'
  const [tab, setTab] = useState(0)

  const tabs = TABS.filter((t) => !(limited && CLINICAL_TABS.has(t)))
  const flags = redFlags.filter((r) => r.patientId === p.id)

  return (
    <>
      <PageHeader
        back
        title={anon ? `ملف المريض ${p.id}` : `ملف المريض — ${p.name}`}
        sub={
          <span className="flex items-center gap-2">
            <Badge tone={p.status === 'في خطر' ? 'red' : 'green'}>{p.status}</Badge>
            <span>{p.subscription}</span>
            {anon && <Badge tone="purple">بدون هوية</Badge>}
            {limited && <Badge tone="blue">عرض محدود</Badge>}
          </span>
        }
      />

      {full && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Btn tone="danger-soft">تجميد الحساب</Btn>
          <Btn tone="outline">تعديل حالة البرنامج</Btn>
          <Btn tone="outline">تصدير PDF</Btn>
          <Btn tone="ghost">+ ملاحظة إدارية</Btn>
        </div>
      )}

      <Card className="p-0">
        <div className="flex gap-1 border-b border-gray-100 px-4 pt-3">
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`rounded-t-lg px-4 py-2.5 text-[14px] font-bold transition ${
                tab === i ? 'bg-[#c7e4e7]/50 text-[#1d656e]' : 'text-[#6b7280] hover:text-[#1f1f21]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tabs[tab] === 'بيانات الحساب' && (
            <div className="grid grid-cols-2 gap-4 text-[14px] md:grid-cols-4">
              <Field k="رقم الملف" v={p.id} />
              <Field k="الاسم" v={anon ? '— (مخفي)' : p.name} />
              <Field k="الحالة" v={p.status} />
              <Field k="الاشتراك" v={p.subscription} />
              <Field k="آخر نشاط" v={p.lastActivity} />
              <Field k="نسبة الالتزام" v={`${p.compliance}%`} />
            </div>
          )}
          {tabs[tab] === 'المعالج والبرنامج' && (
            <div className="grid grid-cols-2 gap-4 text-[14px] md:grid-cols-4">
              <Field k="المعالج الحالي" v={therapists.find((t) => t.id === p.therapistId)?.name ?? '—'} />
              <Field k="البرنامج" v="برنامج إدارة القلق العام" />
              <Field k="الوحدة الحالية" v="الوحدة 3 — إدارة الأفكار" />
              <Field k="الجلسة القادمة" v="2025-11-23" />
            </div>
          )}
          {tabs[tab] === 'التقدم العلاجي' && (
            <div className="space-y-3">
              <div className="text-[14px]">إجمالي التقدم: <ProgressBar value={p.progress} /></div>
              <div className="text-[14px] text-[#6b7280]">الوحدات المكتملة: 3 من 8 — آخر تقييم: PHQ-9 = 12 (تحسّن طفيف)</div>
            </div>
          )}
          {tabs[tab] === 'سجل المزاج' && (
            <div className="space-y-2">
              {moodLog.map((m) => (
                <div key={m.day} className="flex items-center gap-4 rounded-xl bg-[#f7f7f7] px-4 py-3">
                  <span className="w-20 text-[12px] text-[#6b7280]">{m.day}</span>
                  <span className={`text-[18px] font-bold ${m.score <= 2 ? 'text-[#fd4438]' : 'text-[#1d656e]'}`}>{m.score}/10</span>
                  <span className="text-[14px] text-[#6b7280]">{m.note}</span>
                </div>
              ))}
            </div>
          )}
          {tabs[tab] === 'الجلسات' && (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.n} className="flex items-center gap-4 rounded-xl bg-[#f7f7f7] px-4 py-3">
                  <span className="font-bold text-[#1f1f21]">{s.n}</span>
                  <span className="text-[12px] text-[#6b7280]">{s.date}</span>
                  <Badge tone={s.status === 'مكتملة' ? 'green' : 'blue'}>{s.status}</Badge>
                  <span className="flex-1 text-[14px] text-[#6b7280]">{s.notes}</span>
                </div>
              ))}
            </div>
          )}
          {tabs[tab] === 'التحذيرات' && (
            <div className="space-y-2">
              {flags.length === 0 && <p className="text-[14px] text-[#6b7280]">لا تحذيرات مسجلة.</p>}
              {flags.map((f) => (
                <div key={f.id} className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
                  <div className="flex items-center gap-2 font-bold text-[#1f1f21]">
                    <Icon name="flag" size={14} className="inline" /> {f.id} <Badge tone="red">{f.level}</Badge>
                  </div>
                  <p className="mt-1 text-[14px] text-[#6b7280]">{f.reason}</p>
                  <p className="mt-1 text-[12px] text-[#6b7280]">تم الرصد: {f.detectedAt}</p>
                </div>
              ))}
            </div>
          )}
          {tabs[tab] === 'المستندات' && (
            <div className="space-y-2">
              {['إيصال التحويل البنكي.pdf', 'نموذج الموافقة الموقّع.pdf'].map((d) => (
                <div key={d} className="flex items-center gap-3 rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px]">
                  <Icon name="doc" size={18} className="text-[#1d656e]" /> {d}
                  <Btn tone="ghost" className="ms-auto px-3 py-1.5 text-[12px]">عرض</Btn>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </>
  )
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-[#f7f7f7] px-4 py-3">
      <div className="text-[12px] text-[#6b7280]">{k}</div>
      <div className="mt-1 font-bold text-[#1f1f21]">{v}</div>
    </div>
  )
}

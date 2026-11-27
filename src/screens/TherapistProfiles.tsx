import type { TherapistOptions, TherapistProfile, TherapistRevision } from '../api/types'
import { therapistDate } from '../lib/therapists'

const profileFields: [keyof TherapistProfile, string][] = [
  ['full_name', 'الاسم الكامل'], ['job_title', 'المسمّى الوظيفي'], ['specialty', 'التخصص'],
  ['bio', 'النبذة'], ['email', 'البريد الإلكتروني'], ['city', 'المدينة'], ['country', 'الدولة'],
  ['languages', 'اللغات'], ['years_of_experience', 'سنوات الخبرة'],
]

function formatValue(field: keyof TherapistProfile, value: TherapistProfile[keyof TherapistProfile], options: TherapistOptions) {
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) return value.map(code => options.languages.find(o => o.code === code)?.name_ar ?? code).join('، ') || '—'
  if (field === 'country' || field === 'specialty') {
    const choices = field === 'country' ? options.countries : options.specialties
    return choices.find(o => o.code === value)?.name_ar ?? value
  }
  return value
}

function ProfileFields({ profile, options }: { profile: TherapistProfile; options: TherapistOptions }) {
  return (
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
      {profileFields.map(([field, label]) => (
        <div key={field} className={`min-w-0 rounded-xl bg-gray-50 p-2 ${field === 'bio' ? 'sm:col-span-2' : ''}`}>
          <dt className="font-semibold text-[#657381]">{label}</dt>
          <dd className="break-words whitespace-pre-wrap" dir="auto">{formatValue(field, profile[field], options)}</dd>
        </div>
      ))}
    </dl>
  )
}

function ProfileComparison({ published, revision, options }: {
  published: TherapistProfile; revision: TherapistRevision; options: TherapistOptions
}) {
  return (
    <dl className="space-y-2 text-sm">
      {profileFields.map(([field, label]) => {
        const change = revision.changes?.[field]
        const oldValue = change ? change.old : published[field]
        const newValue = change ? change.new : revision.data[field]
        const changed = revision.changes ? !!change : JSON.stringify(oldValue) !== JSON.stringify(newValue)
        return (
          <div key={field} data-changed={changed || undefined} className={`rounded-xl border p-2 ${changed
            ? 'border-amber-300 bg-amber-50' : 'border-[#ebebeb] bg-gray-50'}`}>
            <dt className="flex flex-wrap items-center gap-2 font-semibold">
              {label}
              {changed && <span className="rounded-full bg-amber-100 px-2 text-xs text-amber-900">تم التعديل</span>}
            </dt>
            <dd className="mt-1 grid grid-cols-2 gap-2">
              <div className="min-w-0 break-words whitespace-pre-wrap">
                <span className="block text-xs text-[#657381]">القيمة المنشورة</span>
                <div dir="auto">{formatValue(field, oldValue, options)}</div>
              </div>
              <div className="min-w-0 break-words whitespace-pre-wrap">
                <span className="block text-xs text-[#657381]">القيمة المقترحة</span>
                <div dir="auto">{formatValue(field, newValue, options)}</div>
              </div>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export function TherapistProfiles({ published, isPublished, revision, options }: {
  published: TherapistProfile; isPublished: boolean; revision: TherapistRevision | null; options: TherapistOptions
}) {
  return (
    <>
      <section className="mt-4">
        <h3 className="mb-2 font-bold">{isPublished ? 'الملف المهني المنشور' : 'بيانات الملف الحالية (غير منشورة)'}</h3>
        <ProfileFields profile={published} options={options} />
      </section>
      <section className="mt-4">
        {revision ? (
          <>
            <h3 className="font-bold">{revision.kind === 'update' ? 'تعديلات بانتظار المراجعة' : 'ملف مهني بانتظار المراجعة'}</h3>
            <p className="mb-2 text-sm text-[#657381]">تاريخ الإرسال: {therapistDate(revision.submitted_at)}</p>
            {revision.kind === 'update' ? <ProfileComparison published={published} revision={revision} options={options} />
              : <ProfileFields profile={revision.data} options={options} />}
          </>
        ) : <p className="text-sm text-[#657381]">لا يوجد ملف مهني بانتظار المراجعة.</p>}
      </section>
    </>
  )
}

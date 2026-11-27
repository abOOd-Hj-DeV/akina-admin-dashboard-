import type { TherapistOptions, TherapistProfile, TherapistRevision } from '../api/types'
import { Badge, Card } from '../components/ui'
import { formatAdminDate } from '../lib/format-date'

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
        <div key={field} className={`min-w-0 rounded-xl bg-bg p-2 ${field === 'bio' ? 'sm:col-span-2' : ''}`}>
          <dt className="font-semibold text-muted">{label}</dt>
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
            ? 'border-tint-3 bg-tint-4' : 'border-line-strong bg-bg'}`}>
            <dt className="flex flex-wrap items-center gap-2 font-semibold">
              {label}
              {changed && <Badge tone="blue">تم التعديل</Badge>}
            </dt>
            <dd className="mt-1 grid grid-cols-2 gap-2">
              <div className="min-w-0 break-words whitespace-pre-wrap">
                <span className="block text-xs text-muted">القيمة المنشورة</span>
                <div dir="auto">{formatValue(field, oldValue, options)}</div>
              </div>
              <div className="min-w-0 break-words whitespace-pre-wrap">
                <span className="block text-xs text-muted">القيمة المقترحة</span>
                <div dir="auto">{formatValue(field, newValue, options)}</div>
              </div>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export function TherapistProfiles({ published, revision, rejected, reason, options, actions }: {
  published: TherapistProfile | null; revision: TherapistRevision | null; rejected?: TherapistRevision | null
  reason?: string | null; options: TherapistOptions; actions: React.ReactNode
}) {
  return (
    <>
      {revision && <Card>
        <h3 className="font-bold">{revision.kind === 'update' ? 'تعديلات بانتظار المراجعة' : 'ملف مهني بانتظار المراجعة'}</h3>
        <p className="mb-2 text-sm text-muted">تاريخ الإرسال: {formatAdminDate(revision.submitted_at)}</p>
        {revision.kind === 'update' && published ? <ProfileComparison published={published} revision={revision} options={options} />
          : <ProfileFields profile={revision.data} options={options} />}
        {actions}
      </Card>}
      {published && revision?.kind !== 'update' && <Card>
        <h3 className="mb-2 font-bold">الملف المهني المنشور</h3>
        <ProfileFields profile={published} options={options} />
      </Card>}
      {(rejected || reason) && <Card>
        <h3 className="mb-2 font-bold">{rejected ? 'آخر نسخة مرفوضة' : 'آخر رفض'}</h3>
        {reason && <p className="mb-2 whitespace-pre-wrap break-words text-sm">سبب الرفض: {reason}</p>}
        {rejected?.reviewed_at && <p className="mb-2 text-sm text-muted">تاريخ المراجعة: {formatAdminDate(rejected.reviewed_at)}</p>}
        {rejected && <ProfileFields profile={rejected.data} options={options} />}
      </Card>}
    </>
  )
}

import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { decideRedFlag, countOpenRedFlags, listRedFlags } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { Badge, Banner, Btn, Card, DataState, PageHeader } from '../components/ui'
import Icon from '../components/Icon'
import { formatAdminDate, localizeAdminTimestamps } from '../lib/format-date'
import { redFlagLabel, redFlagPriority } from '../lib/red-flag-label'
import type { RedFlag } from '../types'

type Decision = RedFlag['allowedDecisions'][number]

const decisionLabels: Record<Decision, string> = {
  reactivate: 'إعادة تفعيل الحساب',
  keep_hold: 'إبقاء الحساب معلّقًا',
  close: 'إغلاق الحالة',
}

export default function RedFlags() {
  const { role } = useAuth()
  const a = role ? access(role, 'red-flags') : { level: 'denied' as const }
  const alertOnly = a.mask === 'alert'
  const full = a.level === 'full'
  const canList = a.level === 'full'
  const [revision, setRevision] = useState(0)
  const { data, loading, error, reload } = useAsync(
    canList ? listRedFlags : () => Promise.resolve([]),
    [role, revision],
    { interval: 15_000 },
  )
  const redFlags = data ?? []
  const { data: openCount, loading: countsLoading, error: countsError } = useAsync(
    a.level !== 'denied' ? countOpenRedFlags : () => Promise.resolve(undefined),
    [role, revision],
    { interval: 15_000 },
  )

  const countNotice = countsLoading
    ? 'جارٍ تحميل عدد الحالات المفتوحة…'
    : countsError || openCount === undefined
      ? 'تعذّر تحميل عدد الحالات المفتوحة.'
      : `${openCount} حالة مفتوحة`

  if (alertOnly) {
    return (
      <>
        <PageHeader title="تنبيهات التصعيد" sub="عرض عدد الحالات فقط" />
        <Banner tone="red"><Icon name="warn" size={14} className="ms-1 inline" /> {countNotice}</Banner>
        <Card>
          <p className="text-[14px] text-[#657381]">
            لا يتيح هذا العرض تفاصيل الحالات السريرية. للمتابعة تواصل مع المشرف الإكلينيكي.
          </p>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="حالات الخطر" sub={!full ? 'عرض فقط — الإجراءات متاحة للمشرف الإكلينيكي والمدير الرئيسي' : undefined} />
      {(countsLoading || countsError || !!openCount) && (
        <Banner tone="red"><Icon name="warn" size={14} className="ms-1 inline" /> {countNotice}</Banner>
      )}
      <DataState loading={loading} error={error} hasData={data !== undefined} empty={data !== undefined && redFlags.length === 0} onRetry={reload} />
      <div className="space-y-4">
        {redFlags.map((flag) => (
          <RedFlagCard
            key={flag.id}
            flag={flag}
            full={full}
            onDecision={async (decision, note) => {
              try {
                await decideRedFlag(flag.id, decision, note)
              } catch (cause) {
                if (cause instanceof ApiError && cause.status === 409) reload()
                throw cause
              }
              setRevision((value) => value + 1)
            }}
          />
        ))}
      </div>
    </>
  )
}

export function RedFlagCard({
  flag,
  full,
  onDecision,
}: {
  flag: RedFlag
  full: boolean
  onDecision: (decision: 'reactivate' | 'keep_hold' | 'close', note: string) => Promise<void>
}) {
  const [decisionOpen, setDecisionOpen] = useState(false)
  const whatsapp = flag.patientWhatsapp?.replace(/\D/g, '')
  const priority = redFlagPriority(flag.priority)
  const canDecide = full && flag.allowedDecisions.length > 0

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[16px] font-bold text-[#1f1f21]">{flag.patientName}</h2>
            <Badge tone={priority.tone}>الأولوية: {priority.label}</Badge>
            {flag.status === 'resolved' && <Badge tone="green">تم الحل</Badge>}
            {flag.onHold && <Badge tone="red">الحساب معلّق</Badge>}
            {flag.reactivationRequestedAt && (
              <Badge tone="amber">طلب إعادة تفعيل · {formatAdminDate(flag.reactivationRequestedAt)}</Badge>
            )}
          </div>
          <p className="mt-2 text-[14px] text-[#657381]">
            <span className="font-bold">{redFlagLabel(flag.type, flag.source)}</span>
            {flag.reason && <span> · {flag.reason}</span>}
            {flag.assessmentScore !== null && <span> · الدرجة: {flag.assessmentScore}</span>}
          </p>
          <p className="mt-1 text-[12px] text-[#657381]">
            المعالج: {flag.therapistName ?? 'غير معيّن'} · المتابع: {flag.assigneeName ?? '—'} · {formatAdminDate(flag.detectedAt)}
          </p>
          {flag.actionTaken && (
            <pre className="mt-3 whitespace-pre-wrap font-sans text-[12px] text-[#657381]">{localizeAdminTimestamps(flag.actionTaken)}</pre>
          )}
        </div>
        {full && (
          <div className="flex shrink-0 flex-col gap-2">
            {whatsapp && (
              <a
                className="inline-flex items-center justify-center rounded-xl bg-[#1d919e] px-4 py-2.5 text-center text-[14px] font-bold text-white no-underline hover:bg-[#187a85]"
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                تواصل عبر واتساب
              </a>
            )}
            {canDecide && (
              <Btn tone="outline" onClick={() => setDecisionOpen((open) => !open)}>
                {decisionOpen ? 'إخفاء نموذج القرار' : 'تسجيل قرار المراجعة'}
              </Btn>
            )}
          </div>
        )}
      </div>
      {canDecide && decisionOpen && (
        <RedFlagDecisionForm
          allowedDecisions={flag.allowedDecisions}
          onSubmit={onDecision}
          onCancel={() => setDecisionOpen(false)}
        />
      )}
    </Card>
  )
}

export function RedFlagDecisionForm({
  allowedDecisions,
  onSubmit,
  onCancel,
}: {
  allowedDecisions: Decision[]
  onSubmit: (decision: 'reactivate' | 'keep_hold' | 'close', note: string) => Promise<void>
  onCancel: () => void
}) {
  const [choice, setChoice] = useState<Decision>()
  const decision = choice && allowedDecisions.includes(choice) ? choice : allowedDecisions[0]
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!decision || note.trim().length < 3 || busy) return
    setBusy(true)
    setError('')
    try {
      await onSubmit(decision, note.trim())
      onCancel()
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : 'تعذّر حفظ القرار.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="space-y-3 border-t border-gray-100 pt-4" onSubmit={(event) => void submit(event)}>
      {allowedDecisions.length > 1 ? (
        <fieldset className="space-y-2 text-[14px] text-[#1f1f21]">
          <legend className="mb-2 font-bold">القرار</legend>
          {allowedDecisions.map(option => (
            <label key={option} className="flex items-center gap-2">
              <input type="radio" name="decision" value={option} checked={decision === option} onChange={() => setChoice(option)} />
              {decisionLabels[option]}
            </label>
          ))}
        </fieldset>
      ) : (
        decision && <p className="text-[14px] font-bold text-[#1f1f21]">القرار: {decisionLabels[decision]}</p>
      )}
      <label className="block text-[14px] font-medium text-[#1f1f21]">
        الملاحظة
        <textarea
          className="mt-1 block min-h-24 w-full rounded-xl border border-gray-200 p-3 text-[14px] outline-none focus:border-[#1d919e]"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          required
          minLength={3}
          maxLength={1900}
          disabled={busy}
        />
      </label>
      <p className="text-[12px] text-[#657381]">سجّل ما تم في التواصل مع المريض. تُحفظ الملاحظة في السجل.</p>
      {error && <p role="alert" className="text-[14px] text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!decision || busy || note.trim().length < 3}
          className="inline-flex items-center justify-center rounded-xl bg-[#1d919e] px-4 py-2.5 text-[14px] font-bold text-white disabled:opacity-50"
        >
          {busy ? 'جارٍ الحفظ…' : 'حفظ القرار'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-xl px-4 py-2.5 text-[14px] font-bold text-[#1d919e] hover:bg-[#c7e4e7]/40 disabled:opacity-50"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}

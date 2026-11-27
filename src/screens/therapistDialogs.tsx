import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ApiError } from '../api/client'
import type { ApiAdminTherapist, TherapistActionCode, TherapistRevisionSummary } from '../api/types'
import { Badge, Banner, Btn, Card, DataState } from '../components/ui'
import { THERAPIST_OPTIONS } from '../data/therapistOptions'
import { useAsync } from '../hooks/useAsync'
import { allowedTherapistActions, isDecision, lifecycleCopy, THERAPIST_ACTIONS, therapistSnapshot, verificationLabel } from '../lib/therapists'
import { decideTherapist, getTherapist, getTherapistOptions, manageTherapistInvitation, setTherapistActive } from '../services/data'
import type { Role } from '../types'
import { TherapistProfiles } from './TherapistProfiles'
import { formatAdminDate } from '../lib/format-date'

function Modal({ title, busy = false, onClose, children, drawer = false }: {
  title: string; busy?: boolean; onClose: () => void; children: ReactNode; drawer?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
const titleId = useId()
  useEffect(() => {
    const el = dialog.current
    el?.showModal()
    return () => { el?.close() }
  }, [])
  return (
    <dialog ref={dialog} aria-labelledby={titleId} dir="rtl" onCancel={e => { e.preventDefault(); if (!busy) onClose() }}
      className={`overflow-auto bg-card p-4 shadow-card backdrop:bg-black/40 sm:p-5 ${drawer
        ? 'fixed inset-y-0 start-0 end-auto m-0 h-dvh max-h-none w-[min(100vw,40rem)] max-w-full sm:rounded-e-2xl'
        : 'm-auto max-h-[85vh] w-[min(92vw,40rem)] rounded-2xl'}`}>
      <h2 id={titleId} className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </dialog>
  )
}

const weekdays: Record<string, string> = {
  monday: 'الاثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس',
  friday: 'الجمعة', saturday: 'السبت', sunday: 'الأحد',
}

function availability(value: unknown) {
  if (!value || typeof value !== 'object') return value == null ? '—' : String(value)
  const entries = Object.entries(value)
  if (!entries.length) return '—'
  return (
    <ul className="space-y-1">
      {entries.map(([day, slots]) => (
        <li key={day}>
          {weekdays[day.toLowerCase()] ?? day}: <bdi>{Array.isArray(slots) && slots.every(slot => typeof slot === 'string')
            ? slots.join('، ') || '—' : JSON.stringify(slots)}</bdi>
        </li>
      ))}
    </ul>
  )
}

export type TherapistAction = { therapist: ApiAdminTherapist } & (
  { kind: 'approve' | 'reject'; revision: TherapistRevisionSummary } |
  { kind: Exclude<TherapistActionCode, 'approve' | 'reject'> }
)

function conflictMessage(error: ApiError) {
  if (error.code === 'revision_superseded') return 'أرسل المعالج نسخة أحدث، أعد فتح الطلب'
  if (error.code === 'already_decided') return 'تم البت في هذا الطلب بالفعل.'
  if (error.status === 404) return 'لم يعد الطلب أو الحساب متاحًا. جرى تحديث البيانات.'
  if (error.status === 403) return 'ليس لديك صلاحية لتنفيذ هذا الإجراء. جرى تحديث البيانات.'
  return 'تغيّرت حالة المعالج أو لم يعد الإجراء متاحًا. راجع البيانات المحدّثة.'
}

export function TherapistActionDialog({ action, checking, onClose, onResult }: {
  action: TherapistAction; checking: boolean; onClose: () => void; onResult: (message: string, conflict?: boolean) => void
}) {
  const { kind, therapist } = action
  const copy = THERAPIST_ACTIONS[kind]
  const revision = 'revision' in action ? action.revision : null
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)

  const submit = async () => {
    if (inFlight.current || checking) return
    const trimmed = note.trim()
    const length = Array.from(trimmed).length
    if (kind === 'reject' && (length < 3 || length > 1000)) {
      setError('أدخل سبب الرفض من 3 إلى 1000 حرف.')
      return
    }
    if (length > 1000) { setError('الحد الأقصى هو 1000 حرف.'); return }
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      if ('revision' in action) await decideTherapist(therapist.id, action.revision.id, action.kind, trimmed)
      else if (action.kind === 'suspend' || action.kind === 'reactivate') await setTherapistActive(therapist.id, action.kind === 'reactivate')
      else await manageTherapistInvitation(therapist.id, action.kind)
      onResult(copy.success)
    } catch (cause) {
      if (cause instanceof ApiError) {
        if (cause.status === 422 && cause.errors?.email?.length) {
          setError('البريد الإلكتروني في الملف المهني مستخدم في حساب آخر.')
          return
        }
        if ([403, 404, 409, 410, 422].includes(cause.status)) {
          onResult(conflictMessage(cause), true)
          return
        }
        if (cause.code === 'timeout' || cause.status === 0) {
          setError('تعذّر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى.')
          return
        }
      }
      setError('تعذّر تنفيذ الإجراء. حاول مرة أخرى.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <Modal title={revision ? `${copy.label} ${revision.kind === 'update' ? 'تعديلات الملف المهني' : 'الملف المهني'}` : copy.label} busy={busy} onClose={onClose}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); void submit() }}>
        <p className="text-sm">المعالج: {therapist.full_name}</p>
        {revision && <p className="text-sm text-muted">تاريخ إرسال النسخة: {formatAdminDate(revision.submitted_at)}</p>}
        <p className="text-sm">{copy.prompt}</p>
        {revision && <label className="block text-sm">
          {kind === 'reject' ? 'سبب الرفض (مطلوب)' : 'ملاحظة (اختياري)'}
          <textarea className="mt-1 w-full rounded-xl border border-line-strong px-3 py-2" disabled={busy}
            aria-required={kind === 'reject'} value={note} onChange={e => { setNote(e.target.value); setError('') }} rows={3} />
        </label>}
        {checking && <p role="status" className="text-sm text-muted">جارٍ التحقق من الحالة…</p>}
        {error && <Banner tone="red"><span role="alert">{error}</span></Banner>}
        <div className="flex gap-2">
          <Btn tone={kind === 'reject' || kind === 'cancel_invite' || kind === 'suspend' ? 'danger' : 'primary'}
            type="submit" disabled={busy || checking}>{busy ? 'جارٍ الإرسال…' : 'تأكيد'}</Btn>
          <Btn tone="ghost" onClick={onClose} disabled={busy}>إلغاء</Btn>
        </div>
      </form>
    </Modal>
  )
}

export function TherapistDetails({ id, role, listRow, listRefreshing, listError, onClose, onListReload, onRemoved }: {
  id: string; role: Role | null; listRow?: ApiAdminTherapist; listRefreshing: boolean; listError: boolean
  onClose: () => void; onListReload: () => Promise<void>; onRemoved: (message: string) => void
}) {
  const { data: row, loading, refreshing, error, reload } = useAsync(() => getTherapist(id), [id])
  const { data: options = THERAPIST_OPTIONS } = useAsync(getTherapistOptions, [], { interval: 0 })
  const [confirmation, setConfirmation] = useState<{ action: TherapistAction; listSnapshot: string | null } | null>(null)
  const [notice, setNotice] = useState<{ message: string; conflict?: boolean } | null>(null)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const listSnapshot = listRow ? therapistSnapshot(listRow) : null
  const actions = row && !error ? allowedTherapistActions(row, role) : []
  const revision = row?.pending_revision?.status === 'pending' ? row.pending_revision : null
  if (confirmation && (!row || error || listError || listSnapshot !== confirmation.listSnapshot
    || therapistSnapshot(row) !== therapistSnapshot(confirmation.action.therapist)
    || !actions.includes(confirmation.action.kind)
    || (listRow && !allowedTherapistActions(listRow, role).includes(confirmation.action.kind))
    || ('revision' in confirmation.action && revision?.id !== confirmation.action.revision.id))) setConfirmation(null)

  const checking = loading || refreshing || listRefreshing
  const begin = (action: TherapistAction) => {
    setNotice(null)
    setConfirmation({ action, listSnapshot })
  }
  const actionable = actions.filter(kind => !listRow || allowedTherapistActions(listRow, role).includes(kind))
  const actionDisabled = checking || listError || (row && listSnapshot !== null && therapistSnapshot(row) !== listSnapshot)
  const details = !loading && !error ? row : undefined
  const copy = lifecycleCopy(details?.lifecycle_state)
  const rejection = details?.last_rejected_revision
  const reason = rejection?.review_note ?? (details?.last_review?.status === 'rejected' ? details.last_review.note : details?.approval_note)
  const approvalNote = details?.last_review?.status === 'approved' ? details.last_review.note : null
  const fields: [string, ReactNode][] = details ? [
    ['رقم واتساب', <bdi key="whatsapp">{details.whatsapp_number ?? '—'}</bdi>],
    ['التحقق من واتساب', verificationLabel(details)],
    ['تاريخ الانضمام', formatAdminDate(details.created_at)],
    ['قبول مرضى جدد', details.can_accept_new_clients ? 'نعم' : 'لا'],
    ['أوقات التوفّر', availability(details.availability)],
    ['عدد المرضى', details.clients_count], ['الحد الأقصى للمرضى', details.clients_limit ?? '—'],
    ['التقييم', details.review_count === 0 ? 'لا تقييمات' : details.rating ?? '—'],
  ] : []

  return (
    <>
      <Modal title="تفاصيل المعالج" onClose={onClose} drawer>
        <DataState loading={loading} error={error} hasData={!!row} onRetry={reload} />
        {refreshing && <p role="status" className="mb-2 text-sm text-muted">جارٍ تحديث التفاصيل…</p>}
        {notice && <Banner tone={notice.conflict ? 'amber' : 'teal'}>
          <span role={notice.conflict ? 'alert' : 'status'}>{notice.message}</span>
        </Banner>}
        {details && <div className="space-y-3" aria-busy={refreshing}>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-bold">{details.full_name}</h3>
                <p className="text-sm text-muted">رقم طلب التقديم: <bdi>{details.application_ref ?? '—'}</bdi></p>
              </div>
              <Badge tone={copy.tone}>{copy.label}</Badge>
            </div>
            <p className="mt-2 text-sm">{copy.next}</p>
          </Card>
          <TherapistProfiles published={details.approval_status === 'approved' ? details.published : null}
            revision={revision} rejected={rejection} reason={reason} options={options}
            actions={revision && <div className="mt-3 flex flex-wrap gap-2">
              {(['approve', 'reject'] as const).filter(kind => actionable.includes(kind)).map(kind => (
                <Btn key={kind} tone={kind === 'approve' ? 'green' : 'danger-soft'} disabled={actionDisabled}
                  onClick={() => begin({ kind, therapist: details, revision })}>{THERAPIST_ACTIONS[kind].label}</Btn>
              ))}
            </div>} />
          {approvalNote && <Card>
            <h3 className="mb-2 font-bold">ملاحظة الموافقة</h3>
            <p className="whitespace-pre-wrap break-words text-sm">{approvalNote}</p>
            <p className="mt-2 text-sm text-muted">تاريخ المراجعة: {formatAdminDate(details.last_review?.reviewed_at)}</p>
          </Card>}
          <Card>
            <h3 className="mb-2 font-bold">بيانات الحساب</h3>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {fields.map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-bg p-2">
                <dt className="font-semibold text-muted">{label}</dt><dd>{value}</dd>
              </div>)}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              {actionable.map(kind => {
                if (isDecision(kind)) return null
                return <Btn key={kind} tone="outline" disabled={actionDisabled}
                  onClick={() => begin({ kind, therapist: details })}>{THERAPIST_ACTIONS[kind].label}</Btn>
              })}
            </div>
          </Card>
        </div>}
        <div className="mt-4"><Btn tone="ghost" onClick={onClose}>إغلاق</Btn></div>
      </Modal>
      {confirmation && <TherapistActionDialog action={confirmation.action} checking={checking} onClose={() => setConfirmation(null)}
        onResult={(message, conflict) => {
          if (!mounted.current) { void onListReload(); return }
          setConfirmation(current => current === confirmation ? null : current)
          if (!conflict && confirmation.action.kind === 'cancel_invite') { onRemoved(message); return }
          setNotice({ message, conflict })
          void reload()
          void onListReload()
        }} />}
    </>
  )
}

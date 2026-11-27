import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ApiError } from '../api/client'
import type { ApiAdminTherapist, DocumentType, TherapistRevisionSummary } from '../api/types'
import { Btn, DataState } from '../components/ui'
import { THERAPIST_OPTIONS } from '../data/therapistOptions'
import { useAsync } from '../hooks/useAsync'
import { therapistDate, THERAPIST_STATUS } from '../lib/therapists'
import {
  decideTherapist, DOCUMENT_TYPES, getTherapist, getTherapistLicense,
  getTherapistOptions, requestTherapistDocument, setTherapistActive,
} from '../services/data'
import { TherapistProfiles } from './TherapistProfiles'

const control = 'w-full rounded-xl border border-[#ebebeb] px-3 py-2'
const licenseTypes = new Set(['application/pdf', 'image/png', 'image/jpeg'])
const weekdays: Record<string, string> = {
  monday: 'الاثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس',
  friday: 'الجمعة', saturday: 'السبت', sunday: 'الأحد',
}

function actionError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'
    if (error.code === 'timeout') return 'انتهت مهلة الاتصال بالخادم. حاول مرة أخرى.'
    if (error.status === 0) return 'تعذّر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى.'
  }
  return fallback
}

function Modal({ title, busy, onClose, children, drawer = false }: {
  title: string; busy: boolean; onClose: () => void; children: ReactNode; drawer?: boolean
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
      className={`overflow-auto bg-white p-5 shadow-xl backdrop:bg-black/40 ${drawer
        ? 'fixed inset-y-0 start-0 end-auto m-0 h-dvh max-h-none w-[min(100vw,40rem)] max-w-full rounded-e-2xl'
        : 'm-auto max-h-[85vh] w-[min(92vw,40rem)] rounded-2xl'}`}>
      <h2 id={titleId} className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </dialog>
  )
}

type RevisionAction = { kind: 'approve' | 'reject'; therapist: ApiAdminTherapist; revision: TherapistRevisionSummary }
export type TherapistAction = RevisionAction | { kind: 'active' | 'document'; therapist: ApiAdminTherapist }

export function TherapistActionDialog({ action, onClose, onDone, onConflict }: {
  action: TherapistAction; onClose: () => void; onDone: (message: string) => Promise<void>; onConflict: (message: string) => void
}) {
  const { kind, therapist } = action
  const isDecision = kind === 'approve' || kind === 'reject'
  const title = isDecision ? `${kind === 'approve' ? 'قبول' : 'رفض'} ${action.revision.kind === 'update' ? 'تعديلات الملف المهني' : 'الملف المهني'}`
    : kind === 'active' ? (therapist.is_active ? 'تعليق الحساب' : 'تفعيل الحساب') : 'طلب مستند'
  const noteLabel = kind === 'reject' ? 'سبب الرفض (مطلوب)' : kind === 'document' ? 'سبب الطلب (اختياري)' : 'ملاحظة (اختياري)'
  const [docType, setDocType] = useState<DocumentType>('license')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)

  const submit = async () => {
    if (inFlight.current) return
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
    let success: string
    try {
      switch (kind) {
        case 'approve':
        case 'reject':
          await decideTherapist(therapist.id, action.revision.id, kind, trimmed)
          success = action.revision.kind === 'update'
            ? kind === 'approve' ? 'تم اعتماد تعديلات الملف المهني ونشرها.' : 'تم رفض التعديلات وبقي الملف المنشور كما هو.'
            : kind === 'approve' ? 'تم اعتماد الملف المهني.' : 'تم رفض الملف المهني.'
          break
        case 'active':
          await setTherapistActive(therapist.id, !therapist.is_active)
          success = therapist.is_active ? 'تم تعليق الحساب.' : 'تم تفعيل الحساب.'
          break
        case 'document':
          await requestTherapistDocument({ user_id: therapist.id, doc_type: docType, ...(trimmed ? { reason: trimmed } : {}) })
          success = 'تم إرسال طلب المستند.'
          break
      }
    } catch (cause) {
      if (isDecision && cause instanceof ApiError) {
        if (cause.status === 409 && cause.code === 'revision_superseded') {
          onConflict('أرسل المعالج نسخة أحدث، أعد فتح الطلب')
          return
        }
        if (cause.status === 409 && cause.code === 'already_decided') {
          onConflict('تم البت في هذا الطلب بالفعل.')
          return
        }
        if (cause.status === 422 && cause.errors?.email?.length) {
          setError('البريد الإلكتروني في الملف المهني مستخدم في حساب آخر.')
          inFlight.current = false
          setBusy(false)
          return
        }
      }
      const fallback = kind === 'document' && cause instanceof ApiError && cause.status === 409
        ? 'يوجد طلب مفتوح لهذا النوع من المستندات.'
        : kind === 'active' && cause instanceof ApiError && cause.status === 422
          ? 'يتعذّر تغيير حالة الحساب قبل استكمال تفعيله.'
          : 'تعذّر تنفيذ الإجراء. حاول مرة أخرى.'
      setError(actionError(cause, fallback))
      inFlight.current = false
      setBusy(false)
      return
    }
    await onDone(success)
    onClose()
  }

  return (
    <Modal title={title} busy={busy} onClose={onClose}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); void submit() }}>
        <p className="text-sm">المعالج: {therapist.full_name}</p>
        {isDecision && <p className="text-sm">تاريخ إرسال النسخة: {therapistDate(action.revision.submitted_at)}</p>}
        {kind === 'active' ? <p className="text-sm">هل تريد {title}؟</p> : (
          <>
            {kind === 'document' && (
              <label className="block text-sm">
                نوع المستند
                <select className={control} value={docType} disabled={busy} onChange={e => setDocType(e.target.value as DocumentType)}>
                  {Object.entries(DOCUMENT_TYPES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
            )}
            <label className="block text-sm">
              {noteLabel}
              <textarea className={control} disabled={busy} aria-required={kind === 'reject'} value={note}
                onChange={e => { setNote(e.target.value); setError('') }} rows={3} />
            </label>
          </>
        )}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex gap-2">
          <Btn tone={kind === 'reject' ? 'danger' : 'primary'} type="submit" disabled={busy}>{busy ? 'جارٍ الإرسال…' : 'تأكيد'}</Btn>
          <Btn tone="ghost" onClick={onClose} disabled={busy}>إلغاء</Btn>
        </div>
      </form>
    </Modal>
  )
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

export function TherapistDetails({ id, canDecide, onDecide, onClose }: {
  id: string; canDecide: boolean; onDecide: (action: RevisionAction) => void; onClose: () => void
}) {
  const { data: row, loading, refreshing, error, reload } = useAsync(() => getTherapist(id), [id])
  const { data: options = THERAPIST_OPTIONS } = useAsync(getTherapistOptions, [], { interval: 0 })
  const [licenseBusy, setLicenseBusy] = useState(false)
  const [licenseError, setLicenseError] = useState('')
  const pendingTab = useRef<Window | null>(null)
  useEffect(() => () => { pendingTab.current?.close() }, [])

  const openLicense = async () => {
    if (!canDecide || !row?.has_license || pendingTab.current) return
    setLicenseError('')
    const tab = window.open('about:blank', '_blank')
    if (!tab) { setLicenseError('اسمح بفتح النوافذ المنبثقة لعرض الرخصة.'); return }
    tab.opener = null
    pendingTab.current = tab
    setLicenseBusy(true)
    try {
      const blob = await getTherapistLicense(id)
      if (!licenseTypes.has(blob.type.split(';')[0])) throw new Error()
      if (!tab.closed) {
        const url = URL.createObjectURL(blob)
        try { tab.location.replace(url) }
        finally { window.setTimeout(() => URL.revokeObjectURL(url), 60_000) }
      }
    } catch (cause) {
      tab.close()
      setLicenseError(actionError(cause, 'تعذّر عرض الرخصة أو أنها غير متاحة.'))
    } finally {
      setLicenseBusy(false)
      pendingTab.current = null
    }
  }

  const yesNo = (value: boolean) => value ? 'نعم' : 'لا'
  const revision = row?.pending_revision?.status === 'pending' ? row.pending_revision : null
  const fields: [string, ReactNode][] = row ? [
    ['معرّف المعالج', <bdi key="id">{row.id}</bdi>], ['رقم طلب التقديم', <bdi key="application-ref">{row.application_ref ?? '—'}</bdi>],
    ['حالة الطلب', THERAPIST_STATUS[row.approval_status ?? 'not_submitted']], ['توفّر رخصة قديمة', yesNo(row.has_license)],
    ['التقييم', row.rating ?? '—'],
    ['قبول مرضى جدد', yesNo(row.can_accept_new_clients)], ['أوقات التوفّر', availability(row.availability)],
    ['عدد المرضى', row.clients_count], ['الحد الأقصى للمرضى', row.clients_limit ?? '—'],
    ['حالة الحساب', row.is_active ? 'نشط' : 'غير نشط'],
    ['رقم واتساب', <bdi key="whatsapp">{row.whatsapp_number ?? '—'}</bdi>], ['تاريخ الانضمام', therapistDate(row.created_at)],
    ['تاريخ إرسال الطلب', therapistDate(row.submitted_at)],
  ] : []

  return (
    <Modal title={row ? `تفاصيل المعالج: ${row.full_name}` : 'تفاصيل المعالج'} busy={licenseBusy} onClose={onClose} drawer>
      <DataState loading={loading} error={error} hasData={!!row} onRetry={reload} />
      {refreshing && <p role="status" className="text-sm text-[#657381]">جارٍ تحديث التفاصيل…</p>}
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl bg-gray-50 p-2">
            <dt className="font-semibold text-[#657381]">{label}</dt>
            <dd className="break-words whitespace-pre-wrap">{value}</dd>
          </div>
        ))}
      </dl>
      {row && (
        <>
          {row.last_review ? (
            <div className="mt-4 rounded-xl bg-gray-50 p-2 text-sm">
              <p className="font-semibold">آخر مراجعة: {row.last_review.status === 'approved' ? 'معتمد' : 'مرفوض'} · {therapistDate(row.last_review.reviewed_at)}</p>
              {row.last_review.note && <p className="break-words whitespace-pre-wrap">{row.last_review.status === 'rejected' ? 'سبب الرفض: ' : 'ملاحظة: '}{row.last_review.note}</p>}
            </div>
          ) : row.approval_note && <p className="mt-4 text-sm">سبب الرفض: {row.approval_note}</p>}
          <TherapistProfiles published={row.published} isPublished={row.approval_status === 'approved'} revision={revision} options={options} />
          {canDecide && revision && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn tone="green" disabled={!!error || licenseBusy} onClick={() => onDecide({ kind: 'approve', therapist: row, revision })}>قبول</Btn>
              <Btn tone="danger-soft" disabled={!!error || licenseBusy} onClick={() => onDecide({ kind: 'reject', therapist: row, revision })}>رفض</Btn>
            </div>
          )}
        </>
      )}
      {licenseError && <p role="alert" className="mt-3 text-sm text-red-700">{licenseError}</p>}
      <div className="mt-4 flex gap-2">
        {canDecide && row?.has_license && (
          <Btn disabled={licenseBusy || !!error} onClick={() => void openLicense()}>
            {licenseBusy ? 'جارٍ تحميل الرخصة…' : 'عرض الرخصة'}
          </Btn>
        )}
        <Btn tone="ghost" disabled={licenseBusy} onClick={onClose}>إغلاق</Btn>
      </div>
    </Modal>
  )
}

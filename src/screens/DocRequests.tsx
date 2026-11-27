import { useState, type ComponentProps, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { DOCUMENT_TYPES, downloadDocument, listDocRequests, listDocumentRecipients, requestDocument, reviewDocument } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { Badge, Btn, Card, DataState, PageHeader } from '../components/ui'
import Icon from '../components/Icon'
import { formatAdminDate } from '../lib/format-date'
import type { DocRequest } from '../types'

const statuses: Record<DocRequest['status'], { label: string; tone: ComponentProps<typeof Badge>['tone'] }> = {
  requested: { label: 'بانتظار رفع المستند', tone: 'blue' },
  submitted: { label: 'قيد المراجعة', tone: 'amber' },
  approved: { label: 'مقبول', tone: 'green' },
  rejected: { label: 'مرفوض', tone: 'red' },
  unknown: { label: 'الحالة غير متاحة', tone: 'gray' },
}

export default function DocRequests() {
  const { role } = useAuth()
  const canAct = !!role && access(role, 'doc-requests').level === 'full'
  const { data, loading, error, reload } = useAsync(() => canAct ? listDocRequests() : Promise.resolve([]), [role])
  const docRequests = data ?? []
  const [creating, setCreating] = useState(false)
  const [rejection, setRejection] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const act = async (operation: () => Promise<void>, failure: string) => {
    if (!canAct || busy || loading || error) return
    setBusy(true)
    setErr(null)
    try {
      await operation()
    } catch {
      setErr(failure)
    } finally {
      setBusy(false)
    }
  }
  const review = (id: string, action: 'approve' | 'reject', note?: string) => act(async () => {
    await reviewDocument(id, action, note)
    setRejection(null)
    await reload()
  }, 'تعذّرت مراجعة المستند. تحقق من حالة الطلب وحاول مجددًا.')

  return (
    <>
      <PageHeader title="طلبات الملفات" sub="طلب مستندات إضافية من المعالجين ومراجعتها"
        action={canAct && data && !error && !creating && <Btn disabled={busy} onClick={() => setCreating(true)}>طلب مستند إضافي</Btn>} />
      {err && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-700">{err}</p>}
      <div className="space-y-4">
        <DataState loading={loading} error={error} hasData={data !== undefined} empty={data !== undefined && docRequests.length === 0} onRetry={reload} />
        {canAct && !error && creating && <RequestForm busy={busy} cancel={() => setCreating(false)}
          submit={(userId, type, reason) => void act(async () => {
            await requestDocument(userId, type, reason)
            setCreating(false)
            await reload()
          }, 'تعذّر إرسال طلب المستند. تحقق من عدم وجود طلب مفتوح من النوع نفسه وحاول مجددًا.')} />}
        {canAct && docRequests.map((d) => {
          const { label, tone } = statuses[d.status]
          const disabled = busy || !!error
          return (
            <Card key={d.id} className="flex flex-wrap items-start gap-4">
              <span className="mt-1 text-[#135e66]"><Icon name="file" size={20} /></span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold text-[#0a0a0a]">{d.subject}</span>
                  <Badge tone={tone}>{label}</Badge>
                </div>
                {d.recipient && <p className="mt-1 text-sm text-muted">المعالج: {d.recipient}</p>}
                {d.reason && <p className="mt-1 text-sm text-muted">السبب: {d.reason}</p>}
                {d.reviewNote && <p className="mt-1 text-sm text-muted">ملاحظة المراجعة: {d.reviewNote}</p>}
                <p className="mt-1 text-[12px] text-[#657381]">مقدم الطلب: {d.requestedBy} · {formatAdminDate(d.date)}</p>
              </div>
              <div className="flex gap-2">
                {d.downloadPath && <Btn tone="ghost" disabled={disabled} onClick={() => void act(() => downloadDocument(d), 'تعذّر تنزيل الملف.')}>تنزيل الملف</Btn>}
                {d.status === 'submitted' && (
                  <>
                    {d.hasFile && <Btn tone="green" disabled={disabled} onClick={() => void review(d.id, 'approve')}>قبول</Btn>}
                    <Btn tone="danger-soft" disabled={disabled} onClick={() => setRejection(d.id)}>رفض</Btn>
                  </>
                )}
              </div>
              {d.status === 'submitted' && rejection === d.id && (
                <form className="w-full space-y-2" onSubmit={event => {
                  event.preventDefault()
                  const note = String(new FormData(event.currentTarget).get('note') ?? '').trim()
                  if (note) void review(d.id, 'reject', note)
                  else setErr('أدخل سبب الرفض.')
                }}>
                  <label className="block text-sm">سبب الرفض
                    <textarea name="note" required maxLength={1000} className="mt-1 w-full rounded-xl border border-line-strong p-2" />
                  </label>
                  <div className="flex gap-2">
                    <Btn type="submit" tone="danger-soft" disabled={disabled}>تأكيد الرفض</Btn>
                    <Btn tone="ghost" disabled={busy} onClick={() => { setRejection(null); setErr(null) }}>إلغاء</Btn>
                  </div>
                </form>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}

function RequestForm({ busy, cancel, submit }: {
  busy: boolean
  cancel: () => void
  submit: (userId: string, type: keyof typeof DOCUMENT_TYPES, reason?: string) => void
}) {
  const { data, loading, error, reload } = useAsync(listDocumentRecipients, [], { interval: 0 })
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const userId = String(fields.get('therapist') ?? '')
    const type = String(fields.get('type') ?? '') as keyof typeof DOCUMENT_TYPES
    const reason = String(fields.get('reason') ?? '').trim() || undefined
    if (!busy && !error && data?.some(therapist => therapist.id === userId) && Object.hasOwn(DOCUMENT_TYPES, type)) submit(userId, type, reason)
  }

  return (
    <Card>
      <form className="space-y-3" onSubmit={onSubmit}>
        <h2 className="font-bold">طلب مستند إضافي</h2>
        <DataState loading={loading} error={error} hasData={data !== undefined} empty={data?.length === 0} onRetry={reload} />
        <label className="block text-sm">المعالج
          <select required name="therapist" disabled={loading || !!error || busy} className="mt-1 w-full rounded-xl border border-line-strong p-2">
            <option value="">اختر معالجًا</option>
            {data?.map(therapist => <option key={therapist.id} value={therapist.id}>{therapist.label}</option>)}
          </select>
        </label>
        <label className="block text-sm">نوع المستند
          <select required name="type" disabled={busy} className="mt-1 w-full rounded-xl border border-line-strong p-2">
            {Object.entries(DOCUMENT_TYPES).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
          </select>
        </label>
        <label className="block text-sm">السبب (اختياري)
          <textarea name="reason" maxLength={1000} disabled={busy} className="mt-1 w-full rounded-xl border border-line-strong p-2" />
        </label>
        <div className="flex gap-2">
          <Btn type="submit" disabled={busy || !!error || !data?.length}>إرسال الطلب</Btn>
          <Btn tone="ghost" disabled={busy} onClick={cancel}>إلغاء</Btn>
        </div>
      </form>
    </Card>
  )
}

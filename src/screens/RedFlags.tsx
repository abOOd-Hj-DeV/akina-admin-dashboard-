import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { assignRedFlag, countOpenRedFlags, listRedFlagAssignees, listRedFlags, setRedFlagStatus } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { Badge, Banner, Btn, Card, PageHeader } from '../components/ui'
import Icon from '../components/Icon'

type FlagAction = { id: string; kind: 'resolve' | 'assign' }

export default function RedFlags() {
  const { role } = useAuth()
  const a = role ? access(role, 'red-flags') : { level: 'denied' as const }
  const alertOnly = a.mask === 'alert'
  const full = a.level === 'full'
  const [revision, setRevision] = useState(0)
  const [action, setAction] = useState<FlagAction | null>(null)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const { data: redFlags = [], loading, error } = useAsync(
    !alertOnly && a.level !== 'denied' ? listRedFlags : () => Promise.resolve([]), [role, revision],
  )
  const { data: openCount, loading: countsLoading, error: countsError } = useAsync(
    a.level !== 'denied' ? countOpenRedFlags : () => Promise.resolve(undefined), [role, revision],
  )
  const needsAssignees = full && action?.kind === 'assign'
  const { data: assignees = [], loading: assigneesLoading, error: assigneesError } = useAsync(
    needsAssignees ? listRedFlagAssignees : () => Promise.resolve([]), [needsAssignees],
  )

  function choose(next: FlagAction) {
    setValue('')
    setActionError(null)
    setAction(next)
  }

  async function confirm() {
    if (!full || !action || busy) return
    setActionError(null)
    setBusy(true)
    try {
      if (action.kind === 'assign') await assignRedFlag(action.id, value)
      else await setRedFlagStatus(action.id, 'resolved', `تم الاتصال بالمريض: ${value.trim()}`)
      setAction(null)
      setRevision(n => n + 1)
    } catch (e) {
      setActionError(e instanceof Error && e.message ? e.message : 'تعذّر حفظ الإجراء.')
    } finally {
      setBusy(false)
    }
  }

  const countNotice = countsLoading ? 'جارٍ تحميل عدد الحالات النشطة…'
    : countsError || openCount === undefined ? 'تعذّر تحميل عدد الحالات النشطة.'
    : `${openCount} حالة نشطة في قائمة Red Flags`

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
      <PageHeader title="التصعيد — Red Flags" sub={!full ? 'عرض فقط — الإجراءات متاحة للمشرف الإكلينيكي والمدير الرئيسي' : undefined} />
      {(countsLoading || countsError || !!openCount) && <Banner tone="red"><Icon name="warn" size={14} className="ms-1 inline" /> {countNotice}</Banner>}
      {loading && <p role="status">جارٍ تحميل الحالات…</p>}
      {error && <p role="alert">تعذّر تحميل قائمة الحالات.</p>}
      <div className="space-y-4">
        {redFlags.map((f) => (
          <Card key={f.id} className="flex items-start gap-4">
            <span className={`mt-1 ${f.level === 'تم الحل' ? 'text-emerald-500' : 'text-red-500'}`}><Icon name={f.level === 'تم الحل' ? 'check' : 'flag'} size={20} /></span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-bold text-[#0a0a0a]">{f.id} — {f.patientName} ({f.patientId})</span>
                <Badge tone={f.level === 'حرج' ? 'red' : f.level === 'عالي' ? 'amber' : f.level === 'تم الحل' ? 'green' : 'blue'}>{f.level}</Badge>
              </div>
              <p className="mt-1 text-[14px] text-[#657381]">{f.reason}</p>
              <p className="mt-1 text-[12px] text-[#657381]">المعالج: {f.therapistName} · {f.detectedAt}</p>
              {f.assignedTo && <p className="mt-1 text-[12px] text-[#657381]">تم تعيين مسؤول للمتابعة</p>}
            </div>
            {full && f.level !== 'تم الحل' && (
              <div className="flex flex-col gap-2">
                <Btn tone="danger" disabled={busy} onClick={() => choose({ id: f.id, kind: 'resolve' })}>توثيق الاتصال وحلّ التنبيه</Btn>
                <span title="لا يدعم النظام حجز جلسة طارئة من هذا التنبيه."><Btn tone="blue" disabled>إحالة لجلسة طارئة</Btn></span>
                <Btn tone="outline" disabled={busy} onClick={() => choose({ id: f.id, kind: 'assign' })}>تعيين متابعة</Btn>
                <span title="لا يرسل النظام تحويلًا إلى خدمات الطوارئ."><Btn tone="ghost" disabled>تحويل للطوارئ</Btn></span>
                {action?.id === f.id && (
                  <form className="space-y-2" onSubmit={e => { e.preventDefault(); void confirm() }}>
                    {action.kind === 'assign' ? (
                      <label className="block">
                        مسؤول المتابعة
                        <select className="block w-full rounded border p-2" value={value} onChange={e => setValue(e.target.value)} required disabled={busy || assigneesLoading || !!assigneesError}>
                          <option value="">{assigneesLoading ? 'جارٍ التحميل…' : 'اختر موظفًا إكلينيكيًا'}</option>
                          {assignees.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
                        </select>
                        {assigneesError && <span role="alert">تعذّر تحميل قائمة الموظفين.</span>}
                        {!assigneesLoading && !assigneesError && !assignees.length && <span>لا يوجد موظفون متاحون للمتابعة.</span>}
                      </label>
                    ) : (
                      <label className="block">
                        سجّل نتيجة الاتصال بعد إجرائه خارج اللوحة. التأكيد يغلق هذا التنبيه.
                        <textarea className="block w-full rounded border p-2" value={value} onChange={e => setValue(e.target.value)} required maxLength={1900} disabled={busy} />
                      </label>
                    )}
                    {actionError && <p role="alert">{actionError}</p>}
                    <div className="flex gap-2">
                      <Btn type="submit" disabled={busy || !value.trim() || (action.kind === 'assign' && !assignees.some(staff => staff.id === value))}>{busy ? 'جارٍ الحفظ…' : 'تأكيد'}</Btn>
                      <Btn tone="ghost" disabled={busy} onClick={() => setAction(null)}>إلغاء</Btn>
                    </div>
                  </form>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { TherapistLifecycle } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { access, canInviteTherapist } from '../auth/permissions'
import { Badge, Banner, Btn, Card, DataState, PageHeader, Table } from '../components/ui'
import InviteUserForm from '../components/InviteUserForm'
import { useAsync } from '../hooks/useAsync'
import { allowedTherapistActions, isDecision, lifecycleCopy, THERAPIST_ACTIONS, THERAPIST_LIFECYCLE, therapistSnapshot } from '../lib/therapists'
import { listTherapists } from '../services/data'
import { TherapistActionDialog, TherapistDetails, type TherapistAction } from './therapistDialogs'

const PAGE_SIZE = 15
type Notice = { message: string; conflict?: boolean }

export default function Therapists() {
  const { role, userId } = useAuth()
  const level = role ? access(role, 'therapists').level : 'denied'
  if (level === 'denied') return null
  return <TherapistRoster key={JSON.stringify([role, userId])} readOnly={level === 'read'} />
}

function TherapistRoster({ readOnly }: { readOnly: boolean }) {
  const { role } = useAuth()
  const [state, setState] = useState<TherapistLifecycle | ''>('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [inviting, setInviting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [params, setParams] = useSearchParams()
  const detailId = params.get('therapist')
  const setDetailId = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('therapist', id)
    else next.delete('therapist')
    setParams(next, { replace: true })
  }
  const [action, setAction] = useState<TherapistAction | null>(null)
  const { data, loading, error, refreshing, reload } = useAsync(
    () => listTherapists({ ...(state ? { lifecycle_state: state } : {}), page, per_page: PAGE_SIZE, q: query }),
    [state, page, query],
  )
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const reloadActorList = useCallback(async () => {
    if (mounted.current) await reload()
  }, [reload])
  const pagination = data?.pagination
  const lastPage = pagination && Math.max(1, pagination.last_page)
  const pageOutOfRange = !error && lastPage !== undefined && page > lastPage
  if (pageOutOfRange) setPage(lastPage)

  const canInvite = canInviteTherapist(role)
  const actionRow = action && data?.data.find(row => row.id === action.therapist.id)
  if (action && (loading || error || !actionRow || therapistSnapshot(actionRow) !== therapistSnapshot(action.therapist)
    || !allowedTherapistActions(actionRow, role).includes(action.kind))) setAction(null)

  const report = (message: string, conflict = false) => {
    if (!mounted.current) return
    setNotice({ message, conflict })
    void reload()
  }

  return (
    <>
      <PageHeader title="إدارة المعالجين" sub={readOnly ? 'يمكنك عرض الملفات وإرسال دعوات جديدة.' : 'متابعة الدعوات ومراجعة الملفات المهنية'}
        action={canInvite ? <Btn onClick={() => { setInviting(v => !v); setNotice(null) }}>+ دعوة معالج</Btn> : undefined} />
      {notice && <Banner tone={notice.conflict ? 'amber' : 'teal'}>
        <span role={notice.conflict ? 'alert' : 'status'}>{notice.message}</span>
      </Banner>}
      {canInvite && inviting && <InviteUserForm roles={['therapist']} onCancel={() => setInviting(false)} onDone={() => {
        setInviting(false)
        report('أُرسلت الدعوة عبر واتساب. الخطوة التالية هي تفعيل حساب المعالج.')
      }} />}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-wrap items-center gap-2 text-sm">
            حالة المعالج
            <select className="min-h-9 rounded-xl border border-line-strong px-3 py-2" value={state} onChange={e => {
              setState(e.target.value as TherapistLifecycle | '')
              setPage(1)
            }}>
              <option value="">الكل</option>
              {Object.entries(THERAPIST_LIFECYCLE).map(([code, copy]) => <option key={code} value={code}>{copy.label}</option>)}
            </select>
          </label>
          <form role="search" className="flex flex-wrap items-center gap-2" onSubmit={e => {
            e.preventDefault()
            setQuery(search.trim())
            setPage(1)
          }}>
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} dir="auto"
              aria-label="بحث عن معالج" placeholder="الاسم، رقم الطلب، أو واتساب"
              className="min-h-9 rounded-xl border border-line-strong px-3 py-2 text-sm" />
            <Btn tone="outline" type="submit">بحث</Btn>
            {query && <Btn tone="ghost" onClick={() => { setQuery(''); setSearch(''); setPage(1) }}>مسح البحث</Btn>}
          </form>
          {refreshing && <span role="status" className="text-sm text-muted">جارٍ تحديث القائمة…</span>}
        </div>
        <div className="mt-4" aria-busy={loading || refreshing || pageOutOfRange}>
          <DataState loading={loading || pageOutOfRange} error={error} hasData={data !== undefined}
            empty={!refreshing && data?.data.length === 0} emptyMessage="لا يوجد معالجون مطابقون." onRetry={reload} />
          {!loading && !error && !pageOutOfRange && data && (
            <>
              {!!data.data.length && <Table cols={['الرقم', 'المعالج', 'رقم الطلب', 'الحالة والخطوة التالية', 'التقييم', 'إجراءات']}>
                {data.data.map((row, index) => {
                  const copy = lifecycleCopy(row.lifecycle_state)
                  return (
                    <tr key={row.id} className="border-b border-line last:border-0 hover:bg-bg">
                      <td className="px-3 py-3 font-bold">{(data.pagination.current_page - 1) * PAGE_SIZE + index + 1}</td>
                      <td className="px-3 py-3 font-semibold">{row.full_name}</td>
                      <td className="px-3 py-3"><bdi>{row.application_ref ?? '—'}</bdi></td>
                      <td className="px-3 py-3"><Badge tone={copy.tone}>{copy.label}</Badge><p className="mt-1 text-xs text-muted">{copy.next}</p></td>
                      <td className="px-3 py-3 text-muted">{row.review_count === 0 ? 'لا تقييمات' : row.rating ?? '—'}</td>
                      <td className="px-3 py-3"><div className="flex flex-wrap gap-1.5">
                        <Btn tone="ghost" onClick={() => { setNotice(null); setDetailId(row.id) }}>عرض</Btn>
                        {!readOnly && allowedTherapistActions(row, role).filter(kind => !isDecision(kind)).map(kind => (
                          <Btn key={kind} tone="outline" disabled={refreshing} onClick={() => {
                            setNotice(null)
                            setAction({ kind, therapist: row })
                          }}>{THERAPIST_ACTIONS[kind].label}</Btn>
                        ))}
                      </div></td>
                    </tr>
                  )
                })}
              </Table>}
              {(!refreshing || data.data.length > 0) && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
                <p>إجمالي المعالجين: {data.pagination.total}</p>
                <nav aria-label="صفحات المعالجين" className="flex flex-wrap items-center gap-2">
                  <Btn tone="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</Btn>
                  <span>الصفحة {data.pagination.current_page} من {Math.max(1, data.pagination.last_page)}</span>
                  <Btn tone="outline" disabled={page >= data.pagination.last_page} onClick={() => setPage(page + 1)}>التالي</Btn>
                </nav>
              </div>}
            </>
          )}
        </div>
      </Card>
      {detailId && <TherapistDetails key={detailId} id={detailId} role={readOnly ? null : role}
        listRow={data?.data.find(row => row.id === detailId)} listRefreshing={refreshing} listError={!!error}
        onClose={() => setDetailId(null)} onListReload={reloadActorList} onRemoved={message => { setDetailId(null); report(message) }} />}
      {action && <TherapistActionDialog action={action} checking={refreshing} onClose={() => setAction(null)}
        onResult={(message, conflict) => { setAction(current => current === action ? null : current); report(message, conflict) }} />}
    </>
  )
}

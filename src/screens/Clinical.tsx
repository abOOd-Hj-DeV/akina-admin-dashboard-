import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { listRedFlags } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { API_MOCK } from '../api/client'
import { Badge, Banner, Btn, Card, DataState, PageHeader } from '../components/ui'
import Icon from '../components/Icon'
import { formatAdminDate } from '../lib/format-date'
import { redFlagLabel } from '../lib/red-flag-label'

/** الإشراف الإكلينيكي: المشرف كامل، المدير الرئيسي قراءة فقط */
export default function Clinical() {
  const { role } = useAuth()
  const a = role ? access(role, 'clinical') : { level: 'denied' as const }
  const redFlagAccess = role ? access(role, 'red-flags') : { level: 'denied' as const }
  const canListRedFlags = redFlagAccess.level === 'full'
  const { data, loading, error, reload } = useAsync(
    canListRedFlags ? listRedFlags : () => Promise.resolve([]),
    [role, canListRedFlags],
    { interval: 15_000 },
  )
  const redFlags = data ?? []
  const full = a.level === 'full'
  const critical = redFlags.filter((r) => r.level === 'حرج' || r.level === 'عالي')

  return (
    <>
      <PageHeader
        title="الإشراف الإكلينيكي"
        sub={!full ? 'عرض للقراءة فقط' : 'مراجعة الحالات المحالة والخطط العلاجية — بيانات بدون هوية حسب السياسة'}
      />
      {critical.length > 0 && <Banner tone="red"><Icon name="warn" size={14} className="ms-1 inline" /> هناك {critical.length} حالة حرجة تحتاج تدخلاً فورياً</Banner>}

      <div className="space-y-4">
        <DataState loading={loading} error={error} hasData={data !== undefined} empty={data !== undefined && redFlags.length === 0} onRetry={reload} />
        {redFlags.map((f) => (
          <Card key={f.id} className="flex items-start gap-4">
            <span className="mt-1 text-red-500"><Icon name="flag" size={20} /></span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-bold text-[#0a0a0a]">
                  بلاغ سريري — {role === 'super_admin' ? f.patientName : 'مريض'}
                </h3>
                <Badge tone={f.level === 'حرج' ? 'red' : f.level === 'عالي' ? 'amber' : f.level === 'تم الحل' ? 'green' : 'blue'}>
                  {f.level}
                </Badge>
              </div>
              <p className="mt-1 text-[14px] text-[#657381]">
                <strong>{redFlagLabel(f.type, f.source)}</strong>
                {f.reason && <> · {f.reason}</>}
              </p>
              <p className="mt-1 text-[12px] text-[#657381]">المعالج: {f.therapistName} · تم الرصد: {formatAdminDate(f.detectedAt)}</p>
            </div>
          </Card>
        ))}
      </div>

      {full && API_MOCK && (
        <Card className="mt-6">
          <h3 className="text-[16px] font-semibold text-[#0a0a0a]">مراجعة جلسات وخطط علاج</h3>
          <div className="mt-3 space-y-2">
            {['مراجعة جلسة المعالج T-133 المعلّق', 'قفل خطة علاج للمريض P-1102', 'توصية بتغيير أسلوب الجلسات P-1156'].map((s) => (
              <div key={s} className="flex items-center justify-between rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px]">
                <span>{s}</span>
                <div className="flex gap-2">
                  <Btn tone="green" className="px-3 py-1.5 text-[12px]">اعتماد</Btn>
                  <Btn tone="ghost" className="px-3 py-1.5 text-[12px]">فتح</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}

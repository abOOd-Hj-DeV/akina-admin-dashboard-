import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { listPatients, listTherapistNames } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { Badge, Card, Chip, DataState, DataValue, PageHeader, ProgressBar, SearchBar, Table } from '../components/ui'
import Icon from '../components/Icon'
import { formatAdminDate } from '../lib/format-date'

const tName = (ts: { id: string; name: string }[], id: string) => ts.find((t) => t.id === id || t.name === id)?.name ?? (id.startsWith('د.') ? id : '—')
const statusTone = (s: string) => (s === 'نشط' ? 'green' : s === 'في خطر' ? 'red' : s === 'مجمّد' ? 'gray' : 'amber') as 'green' | 'red' | 'gray' | 'amber'

export default function Patients() {
  const { role } = useAuth()
  const a = role ? access(role, 'patients') : { level: 'denied' as const }
  const canListTherapists = role === 'admin' || role === 'super_admin'
  const { data: patientData, loading, error, reload } = useAsync(listPatients)
  const { data: therapistData, loading: therapistsLoading, error: therapistsError, reload: reloadTherapists } = useAsync(
    canListTherapists ? listTherapistNames : () => Promise.resolve([]),
    [role, canListTherapists],
  )
  const patients = patientData ?? []
  const therapists = therapistData ?? []
  const hideClinical = a.mask === 'no-clinical' || a.mask === 'status-only'
  const anon = a.mask === 'no-identity'
  const statusOnly = a.mask === 'status-only'

  const cols = statusOnly
    ? ['رقم الملف', 'حالة الحساب', 'آخر نشاط', 'إجراءات']
    : hideClinical
      ? ['رقم الملف', 'الاسم', 'المعالج', 'الحالة', 'الاشتراك', 'آخر نشاط', 'إجراءات']
      : ['رقم الملف', 'الاسم', 'المعالج', 'الحالة', 'الاشتراك', 'التقدم', 'الالتزام', 'إجراءات']

  return (
    <>
      <PageHeader
        title="إدارة المرضى"
        sub={anon ? 'وضع بدون هوية — الأسماء مخفية حسب صلاحيات المشرف الإكلينيكي' : statusOnly ? 'عرض حالة الحساب فقط' : undefined}
      />
      {!statusOnly && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Chip icon={<Icon name="doc" size={14} />} label="بحاجة لتقرير" count={<DataValue loading={loading} error={error} value={patients.filter(p => p.needsReport).length} />} tone="blue" />
          <Chip icon={<Icon name="warn" size={14} />} label="غير ملتزم" count={<DataValue loading={loading} error={error} value={patients.filter(p => p.compliance < 50).length} />} tone="amber" />
          <Chip icon={<Icon name="alert" size={14} />} label="في خطر" count={<DataValue loading={loading} error={error} value={patients.filter(p => p.status === 'في خطر').length} />} tone="red" />
        </div>
      )}
      <Card className="p-4">
        <SearchBar placeholder="ابحث بالاسم، رقم الملف، المعالج..." />
        <div className="mt-4">
          <DataState loading={loading} error={error} hasData={patientData !== undefined} empty={patientData !== undefined && patients.length === 0} onRetry={reload} />
          {canListTherapists && <DataState loading={therapistsLoading} error={therapistsError} hasData={therapistData !== undefined} onRetry={reloadTherapists} />}
          <Table cols={cols}>
            {patients.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-[#f7f7f7]/60">
                <td className="px-3 py-3 font-bold text-[#0a0a0a]">
                  {p.status === 'في خطر' && <span className="me-1">⚠️</span>}
                  {p.id}
                </td>
                {!statusOnly && (
                  <td className="px-3 py-3 text-[#0a0a0a]">{anon ? `مريض ${p.id}` : p.name}</td>
                )}
                {!statusOnly && !hideClinical && (
                  <>
                    <td className="px-3 py-3 text-[#657381]">{tName(therapists, p.therapistId)}</td>
                    <td className="px-3 py-3"><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
                    <td className="px-3 py-3 text-[#657381]">{p.subscription}</td>
                    <td className="px-3 py-3"><ProgressBar value={p.progress} /></td>
                    <td className={`px-3 py-3 font-medium ${p.compliance < 50 ? 'text-[#fd4438]' : 'text-emerald-600'}`}>{p.compliance}%</td>
                  </>
                )}
                {hideClinical && !statusOnly && (
                  <>
                    <td className="px-3 py-3 text-[#657381]">{tName(therapists, p.therapistId)}</td>
                    <td className="px-3 py-3"><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
                    <td className="px-3 py-3 text-[#657381]">{p.subscription}</td>
                    <td className="px-3 py-3 text-[#657381]">{formatAdminDate(p.lastActivity)}</td>
                  </>
                )}
                {statusOnly && (
                  <>
                    <td className="px-3 py-3"><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
                    <td className="px-3 py-3 text-[#657381]">{formatAdminDate(p.lastActivity)}</td>
                  </>
                )}
                <td className="px-3 py-3">
                  <Link to={`/patient-profile?id=${p.id}`} className="text-[14px] font-bold text-[#1d919e] no-underline">
                    عرض التفاصيل
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      </Card>
    </>
  )
}

import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { access } from '../auth/permissions'
import { API_MOCK } from '../api/client'
import { adminApi } from '../api/admin'
import { listFaqs } from '../services/data'
import { useAsync } from '../hooks/useAsync'
import { Btn, Card, PageHeader } from '../components/ui'
import Icon from '../components/Icon'

/** الأسئلة الشائعة — المدير + الرئيسي + مدير المحتوى (حسب عقد الـAPI) */
export default function Faqs() {
  const { role } = useAuth()
  const a = role ? access(role, 'faqs') : { level: 'denied' as const }
  const { data: faqs = [], reload } = useAsync(listFaqs)
  const [q, setQ] = useState('')
  const [an, setAn] = useState('')
  const [adding, setAdding] = useState(false)
  const canEdit = a.level === 'full'

  const add = async () => {
    if (!q.trim() || !an.trim()) return
    if (!API_MOCK) await adminApi.createFaq({ question: q, answer: an }).catch(() => {})
    setQ(''); setAn(''); setAdding(false); reload()
  }
  const remove = async (id: string) => {
    if (!API_MOCK) await adminApi.deleteFaq(id).catch(() => {})
    reload()
  }

  return (
    <>
      <PageHeader
        title="الأسئلة الشائعة"
        sub={canEdit ? 'إدارة محتوى الدعم العام — يظهر في تطبيق المريض' : 'عرض فقط'}
        action={canEdit ? <Btn tone="primary" onClick={() => setAdding((v) => !v)}><Icon name="plus" size={14} /> إضافة سؤال</Btn> : undefined}
      />
      {adding && (
        <Card className="mb-4 space-y-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="السؤال" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[14px] outline-none focus:border-[#1d919e]" />
          <textarea value={an} onChange={(e) => setAn(e.target.value)} placeholder="الإجابة" rows={3} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[14px] outline-none focus:border-[#1d919e]" />
          <div className="flex gap-2">
            <Btn tone="green" onClick={() => void add()}>حفظ</Btn>
            <Btn tone="ghost" onClick={() => setAdding(false)}>إلغاء</Btn>
          </div>
        </Card>
      )}
      <div className="space-y-3">
        {faqs.map((f) => (
          <Card key={f.id} className="flex items-start gap-4">
            <span className="mt-1 text-[#1d656e]"><Icon name="doc" size={20} /></span>
            <div className="flex-1">
              <div className="text-[16px] font-bold text-[#1f1f21]">{f.question}</div>
              <p className="mt-1 text-[14px] leading-6 text-[#6b7280]">{f.answer}</p>
            </div>
            {canEdit && (
              <Btn tone="danger-soft" className="px-3 py-1.5 text-[12px]" onClick={() => void remove(f.id)}>حذف</Btn>
            )}
          </Card>
        ))}
        {faqs.length === 0 && <Card className="py-10 text-center text-[14px] text-[#6b7280]">لا أسئلة بعد</Card>}
      </div>
    </>
  )
}

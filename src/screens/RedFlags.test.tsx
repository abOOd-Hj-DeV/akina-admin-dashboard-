import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { RedFlagCard, RedFlagDecisionForm } from './RedFlags'
import type { RedFlag } from '../types'

const heldFlag: RedFlag = {
  id: 'flag-private-id',
  patientId: 'patient-private-id',
  patientName: 'مريم الاختبار',
  patientWhatsapp: '+963944123456',
  type: 'safety',
  priority: 'high',
  status: 'open',
  assignedTo: 'assignee-id',
  assigneeName: 'د. سارة',
  therapistName: 'د. ليلى',
  reason: 'أشار المريض إلى أفكار لإيذاء النفس.',
  level: 'حرج',
  assessmentScore: 27,
  onHold: true,
  holdSince: '2026-04-18T07:10:00.000Z',
  reactivationRequestedAt: '2026-04-18T07:32:00.000Z',
  actionTaken: 'تمت مراجعة الحالة.\nتواصل الفريق مع المريض.',
  detectedAt: '2026-04-18T07:00:00.000Z',
}

describe('واجهة حالات الخطر', () => {
  it('يعرض بطاقة التعليق وطلب إعادة التفعيل دون معرّفات المريض', () => {
    const markup = renderToStaticMarkup(
      <RedFlagCard flag={heldFlag} full onDecision={vi.fn(async () => undefined)} />,
    )

    expect(markup).toContain('مريم الاختبار')
    expect(markup).toContain('أفكار لإيذاء النفس')
    expect(markup).toContain('الحساب معلّق')
    expect(markup).toContain('طلب إعادة تفعيل')
    expect(markup).toContain('الدرجة: 27')
    expect(markup).toContain('د. ليلى')
    expect(markup).toContain('تواصل عبر واتساب')
    expect(markup).toContain('href="https://wa.me/963944123456"')
    expect(markup).not.toContain(heldFlag.id)
    expect(markup).not.toContain(heldFlag.patientId)
    expect(markup).toContain('whitespace-pre-wrap')
  })

  it('يعرض قراري إعادة التفعيل والإبقاء وملاحظة مطلوبة قبل الإرسال', () => {
    const markup = renderToStaticMarkup(
      <RedFlagDecisionForm onHold onSubmit={vi.fn(async () => undefined)} onCancel={vi.fn()} />,
    )

    expect(markup).toContain('إعادة تفعيل الحساب')
    expect(markup).toContain('إبقاء الحساب معلّقًا')
    expect(markup).toContain('سجّل ما تم في التواصل مع المريض. تُحفظ الملاحظة في السجل.')
    expect(markup).toContain('disabled=""')
  })
})

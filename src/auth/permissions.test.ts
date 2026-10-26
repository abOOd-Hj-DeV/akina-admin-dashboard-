import { describe, expect, it } from 'vitest'
import { access, canView, homeFor } from './permissions'
import type { Role, Screen } from '../types'

const roles: Role[] = ['super_admin', 'admin', 'clinical_supervisor', 'finance_partner', 'support_agent', 'content_manager']
const screens: Screen[] = ['dashboard', 'patients', 'patient-profile', 'therapists', 'clinical', 'payments', 'programs', 'doc-requests', 'red-flags', 'reports', 'audit', 'settings', 'tickets']

describe('مصفوفة الصلاحيات', () => {
  it('كل دور يملك تعريفاً وكل شاشة لها مستوى صالح', () => {
    for (const r of roles) for (const s of screens) {
      expect(['full', 'read', 'limited', 'denied']).toContain(access(r, s).level)
    }
  })
  it('Super Admin يشوف كل شيء', () => {
    for (const s of screens) expect(access('super_admin', s).level).not.toBe('denied')
  })
  it('Audit والإعدادات للمدير الرئيسي فقط (المدير: قراءة للسجل)', () => {
    expect(access('admin', 'audit').level).toBe('read')
    expect(access('admin', 'settings').level).toBe('denied')
    for (const r of roles.filter((x) => x !== 'super_admin' && x !== 'admin'))
      expect(access(r, 'audit').level).toBe('denied')
  })
  it('المشرف بدون هوية وبدون مال', () => {
    expect(access('clinical_supervisor', 'patients').mask).toBe('no-identity')
    expect(access('clinical_supervisor', 'payments').level).toBe('denied')
    expect(access('clinical_supervisor', 'clinical').level).toBe('full')
  })
  it('الشريك المالي حوالاته فقط', () => {
    expect(access('finance_partner', 'payments').mask).toBe('own')
    expect(access('finance_partner', 'patients').level).toBe('denied')
    expect(access('finance_partner', 'clinical').level).toBe('denied')
  })
  it('الدعم بلا علاج ومال ومدير المحتوى بلا مرضى', () => {
    expect(access('support_agent', 'clinical').level).toBe('denied')
    expect(access('support_agent', 'payments').level).toBe('denied')
    expect(access('support_agent', 'tickets').level).toBe('full')
    expect(access('content_manager', 'patients').level).toBe('denied')
    expect(access('content_manager', 'dashboard').level).toBe('denied')
    expect(canView('content_manager', 'programs')).toBe(true)
  })
  it('وجهة الدخول لكل دور شاشة مسموحة', () => {
    for (const r of roles) expect(canView(r, homeFor(r))).toBe(true)
  })
  it('المدير لا يرى سريرياً والدعم يرى التنبيه فقط', () => {
    expect(access('admin', 'patients').mask).toBe('no-clinical')
    expect(access('admin', 'clinical').level).toBe('denied')
    expect(access('support_agent', 'red-flags').mask).toBe('alert')
  })
})

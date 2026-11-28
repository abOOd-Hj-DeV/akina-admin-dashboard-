// @vitest-environment happy-dom
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { installDom, mount } from '../test/dom'

const { patient, therapists, redFlags } = vi.hoisted(() => ({
  patient: vi.fn(), therapists: vi.fn(), redFlags: vi.fn(),
}))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ role: 'clinical_supervisor' }) }))
vi.mock('../api/admin', () => ({ adminApi: { patient, therapists, redFlags } }))

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_API_MOCK', 'false')
  installDom()
  patient.mockReset()
  therapists.mockReset()
  redFlags.mockReset().mockResolvedValue({ data: [], pagination: { current_page: 1, last_page: 1, total: 0 } })
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it.each([
  [{ id: 'therapist-private-id', full_name: 'المعالج الجديد' }, 'المعالج الجديد'],
  [{ id: 'therapist-private-id' }, 'اسم المعالج غير متاح'],
  [undefined, 'اسم المعالج غير متاح'],
  [null, 'لا يوجد معالج معيّن'],
])('uses only the authorized current-assignment display name from patient detail (%j)', async (therapist, label) => {
  patient.mockResolvedValue({ data: { id: 'test-patient', full_name: 'اسم المريض', therapist, is_active: true, compliance_level: 'high' } })
  const { default: PatientProfile } = await import('./PatientProfile')
  const view = mount()
  try {
    await view.render(<MemoryRouter initialEntries={['/patient-profile?id=test-patient']}><PatientProfile /></MemoryRouter>)
    const tab = [...view.container.querySelectorAll('button')].find(button => button.textContent === 'المعالج والبرنامج')
    expect(tab).toBeDefined()
    await act(async () => tab?.click())
    expect(view.container.textContent).toContain(label)
    expect(view.container.textContent).not.toMatch(/therapist-private-id|اسم المريض/)
    expect(therapists).not.toHaveBeenCalled()
  } finally {
    await view.unmount()
  }
})

it('does not describe a failed patient request as unassigned', async () => {
  patient.mockRejectedValue(new Error('تعذّر جلب ملف المريض'))
  const { default: PatientProfile } = await import('./PatientProfile')
  const view = mount()
  try {
    await view.render(<MemoryRouter initialEntries={['/patient-profile?id=test-patient']}><PatientProfile /></MemoryRouter>)
    expect(view.container.textContent).toContain('تعذّر التحميل')
    expect(view.container.textContent).not.toContain('لا يوجد معالج معيّن')
  } finally {
    await view.unmount()
  }
})

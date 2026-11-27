// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Role } from '../types'
import { installDom, mount } from '../test/dom'

const { auth, redFlags } = vi.hoisted(() => ({
  auth: { role: 'clinical_supervisor' as Role },
  redFlags: vi.fn(),
}))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../api/admin', () => ({ adminApi: { redFlags } }))

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_API_MOCK', 'false')
  installDom()
  redFlags.mockReset().mockResolvedValue({
    pagination: { current_page: 1, last_page: 1, total: 1 },
    data: [{
      id: 'flag-private-id',
      patient_id: 'patient-private-id',
      patient_name: 'مريض اختباري',
      status: 'open',
      type: 'safety',
      priority: 'high',
      description: 'حالة اصطناعية للمراجعة',
      created_at: '2026-04-01T06:00:00Z',
    }],
  })
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it.each([
  ['super_admin', 'مريض اختباري', 'مريض اختباري'],
  ['super_admin', null, 'مريض'],
  ['clinical_supervisor', 'مريض اختباري', 'مريض'],
] as const)('uses a safe report title for %s with patient name %s', async (role, name, label) => {
  auth.role = role
  const response = await redFlags()
  redFlags.mockReset().mockResolvedValue({ ...response, data: [{ ...response.data[0], patient_name: name }] })
  const { default: Clinical } = await import('./Clinical')
  const view = mount()
  try {
    await view.render(<Clinical />)
    expect(view.container.querySelector('h3')?.textContent).toBe(`بلاغ سريري — ${label}`)
    expect(view.container.innerHTML).not.toMatch(/flag-private-id|patient-private-id/)
    if (role === 'clinical_supervisor') expect(view.container.innerHTML).not.toContain('مريض اختباري')
  } finally {
    await view.unmount()
  }
})

it('does not load or expose case details to the count-only Admin role', async () => {
  auth.role = 'admin'
  const { default: Clinical } = await import('./Clinical')
  const view = mount()
  try {
    await view.render(<Clinical />)
    expect(redFlags).not.toHaveBeenCalled()
    expect(view.container.innerHTML).not.toMatch(/بلاغ سريري|flag-private-id|patient-private-id|مريض اختباري/)
  } finally {
    await view.unmount()
  }
})

it.each(['clinical_supervisor', 'super_admin'] as const)('loads live rows without exposing unsupported clinical actions to %s', async (role) => {
  auth.role = role
  const { default: Clinical } = await import('./Clinical')
  const view = mount()
  try {
    await view.render(<Clinical />)
    expect(view.container.textContent).toContain('حالة اصطناعية للمراجعة')
    expect(redFlags).toHaveBeenCalledTimes(1)
    expect(view.container.querySelectorAll('button, a, [role="button"]')).toHaveLength(0)
  } finally {
    await view.unmount()
  }
})

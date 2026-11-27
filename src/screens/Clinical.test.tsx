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

// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { installDom, mount } from '../test/dom'

const { resources } = vi.hoisted(() => ({ resources: vi.fn() }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ role: 'support_agent' }) }))
vi.mock('../api/admin', () => ({
  adminApi: {
    emergencyResources: resources,
    tickets: vi.fn(async () => ({ data: { data: [], current_page: 1, last_page: 1 } })),
  },
}))

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it.each([true, false])('shows only the approved support resources (available: %s)', async (available) => {
  vi.stubEnv('VITE_API_MOCK', 'false')
  installDom()
  resources.mockReset()
  if (available) resources.mockResolvedValue({ data: { hotlines: [{ label: 'خط اختباري', phones: ['0002'] }] } })
  else resources.mockRejectedValue(new Error('offline'))
  const { default: Tickets } = await import('./Tickets')
  const view = mount()
  try {
    await view.render(<Tickets />)
    expect(view.container.textContent).toContain(available ? 'خط اختباري' : 'تعذّر تحميل موارد الطوارئ')
    expect(view.container.textContent).toContain('لا تتوفر معلومات المناوبة')
    expect(view.container.textContent).not.toMatch(/920033360|طارق العتيبي/)
  } finally {
    await view.unmount()
  }
})

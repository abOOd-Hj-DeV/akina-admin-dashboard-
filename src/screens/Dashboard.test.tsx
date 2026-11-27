// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { Role } from '../types'
import { installDom, mount } from '../test/dom'

const services = vi.hoisted(() => ({
  countOpenRedFlags: vi.fn(),
  getOverview: vi.fn(),
  listDocRequests: vi.fn(),
  listPayments: vi.fn(),
  listRedFlags: vi.fn(),
  listTickets: vi.fn(),
  listWithdrawals: vi.fn(),
  activityFeed: vi.fn(),
}))
const auth = vi.hoisted(() => ({ role: 'admin' as Role | null }))

vi.mock('../services/data', () => services)
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ role: auth.role }) }))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_API_URL', '')
  vi.stubEnv('VITE_API_MOCK', 'false')
  installDom()
  auth.role = 'admin'
  services.countOpenRedFlags.mockReset()
  services.getOverview.mockReset().mockResolvedValue(null)
  services.listDocRequests.mockReset().mockResolvedValue([])
  services.listPayments.mockReset().mockResolvedValue([])
  services.listRedFlags.mockReset().mockResolvedValue([])
  services.listTickets.mockReset().mockResolvedValue([])
  services.listWithdrawals.mockReset().mockResolvedValue([])
  services.activityFeed.mockReset().mockResolvedValue([])
})

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('Dashboard data states', () => {
  it('shows an ellipsis while the red-flag count is pending, then an error instead of zero', async () => {
    const count = deferred<number>()
    services.countOpenRedFlags.mockReturnValue(count.promise)
    const { default: Dashboard } = await import('./Dashboard')
    const view = mount()
    await view.render(<MemoryRouter><Dashboard /></MemoryRouter>)

    expect(view.container.textContent).toContain('حالات الخطر…')
    expect(view.container.textContent).not.toContain('حالات الخطر0')
    expect(services.listRedFlags).not.toHaveBeenCalled()

    await act(async () => { count.reject(new Error('stats unavailable')); await count.promise.catch(() => undefined) })
    expect(view.container.textContent).toContain('حالات الخطر—')
    expect(view.container.textContent).not.toContain('حالات الخطر0')
    expect(view.container.querySelector('[title="تعذّر التحميل"]')).not.toBeNull()
    await view.unmount()
  })
})

// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { Role } from '../types'
import { installDom, mount } from '../test/dom'

const services = vi.hoisted(() => ({
  getOverview: vi.fn(),
  listWithdrawals: vi.fn(),
}))
const auth = vi.hoisted(() => ({ role: 'finance_partner' as Role | null }))

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
  auth.role = 'finance_partner'
  services.getOverview.mockReset().mockResolvedValue(null)
  services.listWithdrawals.mockReset().mockResolvedValue([])
})

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('Reports withdrawal data states', () => {
  it('shows placeholders instead of zero counts and amounts while loading and after failure', async () => {
    const withdrawals = deferred<never[]>()
    services.listWithdrawals.mockReturnValue(withdrawals.promise)
    const { default: Reports } = await import('./Reports')
    const view = mount()
    await view.render(<MemoryRouter><Reports /></MemoryRouter>)

    expect(view.container.textContent).toContain('…')
    expect(view.container.textContent).not.toContain('0 عملية')
    expect(view.container.textContent).not.toContain('0 SR')

    await act(async () => {
      withdrawals.reject(new Error('withdrawals unavailable'))
      await withdrawals.promise.catch(() => undefined)
    })
    expect(view.container.textContent).toContain('—')
    expect(view.container.textContent).not.toContain('0 عملية')
    expect(view.container.textContent).not.toContain('0 SR')
    await view.unmount()
  })
})

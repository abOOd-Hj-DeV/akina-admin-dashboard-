// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { Role } from '../types'
import { installDom, mount } from '../test/dom'

const adminApi = vi.hoisted(() => ({
  users: vi.fn(),
  setUserActive: vi.fn(),
  cancelInvitation: vi.fn(),
  resendInvitation: vi.fn(),
}))
const auth = vi.hoisted(() => ({ role: 'admin' as Role | null }))

vi.mock('../api/admin', () => ({ adminApi }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ role: auth.role }) }))

const pending = {
  id: 'user-1',
  name: 'مستخدم الاختبار',
  email: 'test@sakina.app',
  role: 'support_agent',
  is_active: true,
  pending_invitation: true,
  created_at: '2026-04-01',
}
const accepted = { ...pending, pending_invitation: false }

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.stubEnv('VITE_API_URL', '')
  vi.stubEnv('VITE_API_MOCK', 'false')
  installDom()
  auth.role = 'admin'
  adminApi.users.mockReset()
    .mockResolvedValueOnce({ data: [pending], last_page: 1 })
    .mockResolvedValue({ data: [accepted], last_page: 1 })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('refreshes pending invitations automatically', async () => {
  const { default: Users } = await import('./Users')
  const view = mount()
  await view.render(<MemoryRouter><Users /></MemoryRouter>)
  expect(view.container.textContent).toContain('دعوة معلّقة')

  await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
  expect(view.container.textContent).toContain('نشط')
  expect(view.container.textContent).not.toContain('دعوة معلّقة')
  expect(adminApi.users).toHaveBeenCalledTimes(2)
  await view.unmount()
})

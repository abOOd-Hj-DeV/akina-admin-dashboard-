// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Role } from '../types'
import { installDom, mount } from '../test/dom'

const adminApi = vi.hoisted(() => ({
  users: vi.fn(),
  setUserActive: vi.fn(),
  cancelInvitation: vi.fn(),
  resendInvitation: vi.fn(),
  therapists: vi.fn(),
  therapist: vi.fn(),
  therapistOptions: vi.fn(),
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
  allowed_staff_actions: ['resend_invite', 'cancel_invite'],
  invitation: { retry_after: 0, resend_available_at: '2026-04-01T00:01:00Z', code_usable: true },
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

it('rechecks the row at the advertised boundary and never resends an invitation accepted elsewhere', async () => {
  adminApi.users.mockReset()
    .mockResolvedValueOnce({ data: [{ ...pending, allowed_staff_actions: ['cancel_invite'], invitation: { ...pending.invitation, retry_after: 1 } }], last_page: 1 })
    .mockResolvedValueOnce({ data: [{ ...accepted, allowed_staff_actions: ['deactivate'], invitation: null }], last_page: 1 })
  adminApi.resendInvitation.mockClear()
  const { default: Users } = await import('./Users')
  const view = mount()
  try {
    await view.render(<MemoryRouter><Users /></MemoryRouter>)
    expect(view.container.textContent).toContain('يمكن إعادة الدعوة بعد')
    expect([...view.container.querySelectorAll('button')].some((button) => button.textContent === 'إعادة الدعوة')).toBe(false)
    await act(async () => { await vi.advanceTimersByTimeAsync(999) })
    expect(adminApi.users).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(adminApi.users).toHaveBeenCalledTimes(2)
    expect(view.container.textContent).not.toContain('يمكن إعادة الدعوة بعد')
    expect(view.container.textContent).toContain('تعطيل')
    expect(adminApi.resendInvitation).not.toHaveBeenCalled()
  } finally {
    await view.unmount()
  }
})

it('renders only server-authorized staff status actions and reloads a stale row after refusal', async () => {
  auth.role = 'super_admin'
  const own = { ...accepted, id: 'self', name: 'own row', role: 'super_admin', allowed_staff_actions: [] }
  const target = { ...accepted, id: 'target', name: 'another row', allowed_staff_actions: ['deactivate'] }
  const legacy = { ...accepted, id: 'old', name: 'unverified capability' }
  adminApi.users.mockReset().mockResolvedValueOnce({ data: [own, target, legacy], last_page: 1 })
    .mockResolvedValueOnce({ data: [own, { ...target, allowed_staff_actions: [] }, legacy], last_page: 1 })
  adminApi.setUserActive.mockReset().mockRejectedValueOnce(new Error('refused'))
  const { default: Users } = await import('./Users')
  const view = mount()
  try {
    await view.render(<MemoryRouter><Users /></MemoryRouter>)
    const [selfRow, targetRow, legacyRow] = view.container.querySelectorAll('tbody tr')
    expect(selfRow.querySelector('button')).toBeNull()
    expect(legacyRow.querySelector('button')).toBeNull()
    await act(async () => targetRow.querySelector('button')!.click())
    expect(adminApi.setUserActive).toHaveBeenCalledWith('target', false)
    expect(view.container.textContent).toContain('refused')
    expect(view.container.querySelectorAll('tbody button')).toHaveLength(0)
  } finally {
    await view.unmount()
  }
})

it('routes an admin from a therapist user row to that therapist’s read-only lifecycle details', async () => {
  const user = { ...accepted, id: 'therapist-1', role: 'therapist', name: 'معالج تجريبي' }
  adminApi.users.mockReset().mockResolvedValue({ data: [user, pending], last_page: 1 })
  adminApi.therapists.mockResolvedValue({ data: [], pagination: { current_page: 1, last_page: 1, total: 0 } })
  adminApi.therapist.mockResolvedValue({ data: {
    id: user.id, full_name: user.name, lifecycle_state: 'awaiting_profile', allowed_actions: ['suspend'],
    approval_status: null, activated: true, review_count: 0,
  } })
  const [{ default: Users }, { default: Therapists }] = await Promise.all([import('./Users'), import('./Therapists')])
  const view = mount()
  await view.render(<MemoryRouter initialEntries={['/users']}><Routes>
    <Route path="/users" element={<Users />} />
    <Route path="/therapists" element={<Therapists />} />
  </Routes></MemoryRouter>)
  const [therapistRow, staffRow] = view.container.querySelectorAll('tbody tr')
  expect(therapistRow.textContent).not.toContain('نشط')
  expect(therapistRow.querySelector('button')).toBeNull()
  expect(staffRow.textContent).toContain('إعادة الدعوة')
  expect(staffRow.textContent).toContain('إلغاء الدعوة')
  const link = therapistRow.querySelector('a')!
  expect(link.getAttribute('href')).toBe('/therapists?therapist=therapist-1')
  await act(async () => link.click())
  expect(adminApi.therapist).toHaveBeenCalledWith(user.id)
  expect(view.container.querySelector('dialog')?.textContent).toContain('بانتظار الملف المهني')
  expect(view.container.querySelector('dialog')?.textContent).not.toContain('تعليق الحساب')
  expect(view.container.textContent).not.toContain('+ دعوة معالج')
  await view.unmount()
})

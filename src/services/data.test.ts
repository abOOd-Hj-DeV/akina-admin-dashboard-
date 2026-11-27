import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ audit: vi.fn(), patients: vi.fn(), tickets: vi.fn() }))
vi.mock('../api/admin', () => ({ adminApi: api }))

const patient = (id: string) => ({
  id,
  full_name: `Patient ${id}`,
  therapist: null,
  is_active: true,
  safety_flag: false,
  upcoming_sessions_count: 0,
  compliance_level: 'high',
  last_login: null,
})

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_API_URL', '')
  vi.stubEnv('VITE_API_MOCK', 'false')
  api.patients.mockReset()
  api.audit.mockReset()
  api.tickets.mockReset()
})

afterEach(() => vi.unstubAllEnvs())

describe('paginated dashboard data', () => {
  it('fetches every page for full-list counts', async () => {
    api.patients
      .mockResolvedValueOnce({ data: [patient('one')], pagination: { current_page: 1, last_page: 2, total: 2 } })
      .mockResolvedValueOnce({ data: [patient('two')], pagination: { current_page: 2, last_page: 2, total: 2 } })
    const { listPatients } = await import('./data')

    const rows = await listPatients()

    expect(rows.map((row) => row.id)).toEqual(['one', 'two'])
    expect(api.patients.mock.calls.map(([filters]) => filters.page)).toEqual([1, 2])
  })

  it('rejects malformed pagination instead of silently returning a partial list', async () => {
    api.patients.mockResolvedValue({
      data: [patient('one')],
      pagination: { current_page: 1, last_page: 1001, total: 1001 },
    })
    const { listPatients } = await import('./data')

    await expect(listPatients()).rejects.toThrow('ترقيم صفحات غير صالح')
    expect(api.patients).toHaveBeenCalledTimes(1)
  })

  it('fetches every support-ticket paginator page', async () => {
    const ticket = (id: string) => ({
      id,
      subject: `Ticket ${id}`,
      user: { name: 'User' },
      type: 'technical',
      status: 'open',
      created_at: '2026-04-01',
    })
    api.tickets
      .mockResolvedValueOnce({ data: { data: [ticket('one')], current_page: 1, last_page: 2, total: 2 } })
      .mockResolvedValueOnce({ data: { data: [ticket('two')], current_page: 2, last_page: 2, total: 2 } })
    const { listTickets } = await import('./data')

    expect((await listTickets()).map((row) => row.id)).toEqual(['one', 'two'])
    expect(api.tickets.mock.calls.map(([filters]) => filters.page)).toEqual([1, 2])
  })

  it('limits the activity feed to the first audit page while Audit still fetches all pages', async () => {
    const entry = (id: string) => ({
      id,
      action: `Action ${id}`,
      timestamp: '2026-04-01T10:00:00Z',
      actor: { id: 'actor', name: 'Staff', role: 'admin' },
      entity_id: id,
      details: {},
    })
    api.audit.mockResolvedValueOnce({
      data: Array.from({ length: 10 }, (_, index) => entry(String(index))),
      pagination: { current_page: 1, last_page: 3, total: 30 },
    })
    const { activityFeed, listAudit } = await import('./data')

    expect(await activityFeed()).toHaveLength(8)
    expect(api.audit).toHaveBeenCalledTimes(1)
    expect(api.audit).toHaveBeenCalledWith({ page: 1 })

    api.audit.mockReset()
    api.audit
      .mockResolvedValueOnce({
        data: [entry('one')],
        pagination: { current_page: 1, last_page: 2, total: 2 },
      })
      .mockResolvedValueOnce({
        data: [entry('two')],
        pagination: { current_page: 2, last_page: 2, total: 2 },
      })

    expect((await listAudit()).map((row) => row.action)).toEqual(['Action one', 'Action two'])
    expect(api.audit.mock.calls.map(([filters]) => filters.page)).toEqual([1, 2])
  })
})

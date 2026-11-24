import { beforeEach, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RedFlags from './RedFlags'
import type { Role } from '../types'

const mocks = vi.hoisted(() => ({
  role: 'super_admin' as Role,
  list: vi.fn(),
  counts: vi.fn(),
  assignees: vi.fn(),
  requests: [] as unknown[],
  loading: false,
  error: null as Error | null,
}))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ role: mocks.role }) }))
vi.mock('../services/data', () => ({
  listRedFlags: mocks.list, countOpenRedFlags: mocks.counts, listRedFlagAssignees: mocks.assignees,
  assignRedFlag: vi.fn(), setRedFlagStatus: vi.fn(),
}))
vi.mock('../hooks/useAsync', () => ({
  useAsync: (request: unknown) => {
    mocks.requests.push(request)
    if (request === mocks.counts) return { data: mocks.loading || mocks.error ? undefined : 6, loading: mocks.loading, error: mocks.error }
    if (request === mocks.list) return { data: [{
      id: 'flag-1', patientId: 'patient-1', patientName: 'Patient Name', level: 'حرج', reason: 'private details',
    }] }
    return {}
  },
}))

beforeEach(() => {
  mocks.requests = []
  mocks.loading = false
  mocks.error = null
})

it.each(['support_agent', 'admin'] as const)('%s receives only the open case count', role => {
  mocks.role = role
  const html = renderToStaticMarkup(<RedFlags />)
  expect(html).toContain('6 حالة نشطة')
  expect(html).not.toContain('private details')
  expect(html).not.toContain('تعيين متابعة')
  expect(mocks.requests).toContain(mocks.counts)
  expect(mocks.requests).not.toContain(mocks.list)
  expect(mocks.requests).not.toContain(mocks.assignees)
})

it('does not claim zero when the counts request is pending or fails', () => {
  mocks.role = 'support_agent'
  mocks.loading = true
  expect(renderToStaticMarkup(<RedFlags />)).toContain('جارٍ تحميل عدد الحالات النشطة')
  mocks.loading = false
  mocks.error = new Error('unavailable')
  const html = renderToStaticMarkup(<RedFlags />)
  expect(html).toContain('تعذّر تحميل عدد الحالات النشطة')
  expect(html).not.toContain('0 حالة نشطة')
})

it('shows a real patient name and labels unwired emergency actions as unavailable', () => {
  mocks.role = 'super_admin'
  const html = renderToStaticMarkup(<RedFlags />)
  expect(html).toContain('Patient Name')
  expect(html).toContain('توثيق الاتصال وحلّ التنبيه')
  expect(html).toContain('تعيين متابعة')
  expect(html).toMatch(/title="[^"]+"><button[^>]+disabled[^>]*>إحالة لجلسة طارئة/)
  expect(html).toMatch(/title="[^"]+"><button[^>]+disabled[^>]*>تحويل للطوارئ/)
})

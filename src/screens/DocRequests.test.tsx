// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { installDom, mount } from '../test/dom'
import type { Role } from '../types'

const auth = vi.hoisted(() => ({ role: 'admin' as Role }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth }))

const uuid = '1a111111-1111-4111-8111-111111111111'
const listPath = '/api/v1/admin/documents'
const filePath = `/api/v1/files/download/uploads/${uuid}/document_requests/example.pdf`
const request = {
  id: 'doc', user_id: uuid, user_name: 'معالج تجريبي', requested_at: '2026-04-30T22:05:00Z',
  doc_type: 'certificate', status: 'requested', has_file: false,
}
const paginate = (data: unknown[]) => Response.json({ data, pagination: { current_page: 1, last_page: 1, total: data.length } })
const fetchApi = vi.fn<(path: string, init?: RequestInit) => Promise<Response>>()
let rows: unknown[]
let therapists: unknown[]

beforeEach(() => {
  vi.resetModules()
  installDom()
  auth.role = 'admin'
  vi.stubEnv('VITE_API_URL', '')
  vi.stubEnv('VITE_API_MOCK', 'false')
  rows = [
    request,
    { ...request, id: 'submitted', status: 'submitted', has_file: true, download_url: `https://backend.example${filePath}`, original_name: 'certificate.pdf' },
    { ...request, id: 'missing-link', status: 'approved', has_file: true, download_url: '/unrelated/file_path' },
  ]
  therapists = [{ id: uuid, full_name: 'معالج تجريبي' }]
  fetchApi.mockReset().mockImplementation(async (path, init) => {
    if (path === `${listPath}?page=1`) return paginate(rows)
    if (path.startsWith('/api/v1/admin/therapists?')) return paginate(therapists)
    if (path === listPath && init?.method === 'POST') return Response.json({ data: request }, { status: 201 })
    if (path === `${listPath}/submitted/review`) {
      const { action, note } = JSON.parse(String(init?.body))
      if (action === 'approve') return Response.json({}, { status: 409 })
      rows = [{ ...request, status: 'rejected', review_note: note }]
      return Response.json({})
    }
    if (path === filePath) return new Response('document')
    throw new Error('Unexpected request')
  })
  vi.stubGlobal('fetch', fetchApi)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const click = (scope: HTMLElement, label: string) => act(async () => {
  const button = Array.from(scope.querySelectorAll('button')).find(b => b.textContent === label)
  expect(button).toBeDefined()
  button?.click()
})
const submit = (form: HTMLFormElement) => act(async () => {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
})

it('creates a manual request through the staff API using a selected therapist', async () => {
  const { default: DocRequests } = await import('./DocRequests')
  const view = mount()
  await view.render(<DocRequests />)
  await click(view.container, 'طلب مستند إضافي')
  const form = view.container.querySelector('form')!
  form.querySelector<HTMLSelectElement>('[name=therapist]')!.value = uuid
  form.querySelector<HTMLSelectElement>('[name=type]')!.value = 'certificate'
  form.querySelector<HTMLTextAreaElement>('[name=reason]')!.value = 'توثيق مؤهل'
  await submit(form)
  const creation = fetchApi.mock.calls.find(([path]) => path === listPath)
  expect(creation?.[1]?.method).toBe('POST')
  expect(JSON.parse(String(creation?.[1]?.body))).toEqual({ user_id: uuid, doc_type: 'certificate', reason: 'توثيق مؤهل' })
  expect(view.container.querySelector('form')).toBeNull()
  await view.unmount()
})

it('distinguishes same-name recipients without exposing a full WhatsApp number or UUID in the label', async () => {
  const secondId = '2a222222-2222-4222-8222-222222222222'
  const thirdId = '3a333333-3333-4333-8333-333333333333'
  const name = 'معالج تجريبي'
  therapists = [
    { id: uuid, full_name: name, application_ref: 'APP-25', whatsapp_number: '+1 202-555-0100' },
    { id: secondId, full_name: name, application_ref: null, whatsapp_number: '+1 (202) 555-0101' },
    { id: thirdId, full_name: name, application_ref: null, whatsapp_number: '+1 (303) 555-0101' },
  ]

  const { default: DocRequests } = await import('./DocRequests')
  const view = mount()
  await view.render(<DocRequests />)
  await click(view.container, 'طلب مستند إضافي')
  const form = view.container.querySelector('form')!
  const select = form.querySelector<HTMLSelectElement>('[name=therapist]')!
  expect(Array.from(select.options).slice(1).map(option => option.textContent)).toEqual([
    `${name} — رقم الطلب: APP-25`,
    `${name} — واتساب: ••••0101`,
    `${name} — واتساب: ••••0101 (2)`,
  ])
  select.value = select.options[2].value
  await submit(form)
  const creation = fetchApi.mock.calls.find(([path]) => path === listPath)
  expect(JSON.parse(String(creation?.[1]?.body)).user_id).toBe(secondId)
  await view.unmount()
})

it('gates review and file actions, requires a rejection reason, and never fakes success', async () => {
  const { tokenStore } = await import('../api/client')
  tokenStore.set('test-token')
  const { default: DocRequests } = await import('./DocRequests')
  const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:document')
  const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const view = mount()
  await view.render(<DocRequests />)
  const labels = () => Array.from(view.container.querySelectorAll('button'), b => b.textContent)
  expect(labels()).not.toContain('رفع للمدير')
  expect(labels().filter(label => label === 'تنزيل الملف')).toHaveLength(1)
  expect(labels().filter(label => label === 'قبول')).toHaveLength(1)
  expect(view.container.innerHTML).not.toContain(filePath)
  await click(view.container, 'تنزيل الملف')
  expect(fetchApi).toHaveBeenCalledWith(filePath, expect.objectContaining({
    headers: expect.objectContaining({ Authorization: 'Bearer test-token' }), cache: 'no-store', redirect: 'error',
  }))
  expect(createUrl).toHaveBeenCalledOnce()
  expect(download.mock.contexts[0]).toHaveProperty('download', 'certificate.pdf')
  await click(view.container, 'قبول')
  expect(view.container.querySelector('[role=alert]')?.textContent).toContain('تعذّرت مراجعة المستند')
  expect(view.container.textContent).toContain('قيد المراجعة')
  await click(view.container, 'رفض')
  const form = view.container.querySelector('form')!
  await submit(form)
  expect(fetchApi.mock.calls.filter(([path]) => path.endsWith('/review'))).toHaveLength(1)
  form.querySelector('textarea')!.value = 'أرسل نسخة أوضح.'
  await submit(form)
  expect(fetchApi).toHaveBeenCalledWith(`${listPath}/submitted/review`, expect.objectContaining({
    method: 'POST', body: JSON.stringify({ action: 'reject', note: 'أرسل نسخة أوضح.' }),
  }))
  expect(view.container.textContent).toContain('مرفوض')
  expect(view.container.textContent).toContain('أرسل نسخة أوضح.')
  await view.unmount()
})

it.each(['support_agent', 'clinical_supervisor'] as Role[])('does not grant document actions to %s', async role => {
  auth.role = role
  const { default: DocRequests } = await import('./DocRequests')
  const view = mount()
  await view.render(<DocRequests />)
  expect(fetchApi).not.toHaveBeenCalled()
  expect(view.container.querySelector('button')).toBeNull()
  await view.unmount()
})

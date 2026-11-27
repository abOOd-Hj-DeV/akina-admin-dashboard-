// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ApiAdminTherapist } from '../api/types'
import type { Role } from '../types'
import { installDom, mount } from '../test/dom'

const auth = vi.hoisted(() => ({ role: 'super_admin' as Role }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ role: auth.role }) }))

const root = '/api/v1/admin/therapists'
const pending: ApiAdminTherapist = {
  id: '6a0af6a3-0c12-4abb-8e86-f390a0b2e9db', full_name: 'معالج تجريبي', has_license: true, specialty: 'anxiety',
  country: 'SY', languages: ['ar', 'لغة محفوظة'], bio: 'نبذة تجريبية', years_of_experience: 6, rating: 4.5,
  approval_status: 'pending', can_accept_new_clients: true, availability: { monday: ['09:00-12:00'] },
  clients_count: 5, clients_limit: 10, is_active: true, whatsapp_number: '+963983321260',
  created_at: '2026-04-01T12:15:00Z', approval_note: null, submitted_at: '2026-04-02T12:15:00Z',
}
const rows: ApiAdminTherapist[] = [
  pending,
  { ...pending, id: 'no-license', full_name: 'بلا رخصة', has_license: false },
  { ...pending, id: 'not-submitted', full_name: 'لم يقدّم', approval_status: null, has_license: false, submitted_at: null },
  { ...pending, id: 'approved', full_name: 'حساب معلّق', approval_status: 'approved', is_active: false },
  { ...pending, id: 'rejected', full_name: 'طلب مرفوض', approval_status: 'rejected', approval_note: 'سبب تجريبي' },
]
const remoteOptions = {
  countries: [{ code: 'SY', name_ar: 'سوريا' }],
  languages: [{ code: 'ar', name_ar: 'العربية' }, { code: 'en', name_ar: 'الإنجليزية' }],
  specialties: [{ code: 'anxiety', name_ar: 'اضطرابات القلق' }],
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
const page = (data: ApiAdminTherapist[], current_page = 1, last_page = 1, total = data.length) =>
  json({ data, pagination: { current_page, last_page, total } })
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>()
const defaultResponse = (url: string) => {
  if (url.startsWith(root + '?')) return page(rows)
  if (url === root + '/' + pending.id) return json({ data: pending })
  if (url === '/api/v1/meta/therapist-options') return json({ data: remoteOptions })
  throw new Error('Unexpected endpoint: ' + url)
}

let view: ReturnType<typeof mount> | undefined
beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_API_URL', '')
  vi.stubEnv('VITE_API_MOCK', 'false')
  installDom()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset().mockImplementation(async (url) => defaultResponse(url))
  auth.role = 'super_admin'
})
afterEach(async () => {
  await view?.unmount()
  view = undefined
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

async function render() {
  const [{ default: Therapists }, { tokenStore }] = await Promise.all([import('./Therapists'), import('../api/client')])
  tokenStore.set('test-access-token')
  view = mount()
  await view.render(<Therapists />)
  return view.container
}
const button = (parent: ParentNode, text: string) => Array.from(parent.querySelectorAll('button')).find(b => b.textContent === text)
const click = (parent: ParentNode, text: string) => act(async () => { button(parent, text)!.click() })
const select = (el: HTMLSelectElement, value: string) => act(async () => {
  el.value = value
  el.dispatchEvent(new Event('change', { bubbles: true }))
})
const input = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => act(async () => {
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set!.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
})
const request = (url: string) => fetchMock.mock.calls.find(([path]) => path === url)?.[1]
const dialog = (container: ParentNode) => container.querySelector('dialog')!

it('passes status and page to the paginated API; auto-refreshes and displays Arabic states and row numbers', async () => {
  vi.useFakeTimers()
  fetchMock.mockImplementation(async url => {
    if (url.includes('page=2')) return page([rows[4]], 2, 2, 16)
    if (url.includes('status=not_submitted')) return page([rows[2]])
    return page(rows, 1, 2, 16)
  })
  const container = await render()
  expect(request(root + '?status=all&page=1&per_page=15')).toBeDefined()
  expect([...container.querySelectorAll('tbody tr')].map(tr => tr.children[2].textContent))
    .toEqual(['قيد المراجعة', 'قيد المراجعة', 'لم يُرسل الطلب', 'معتمد', 'مرفوض'])
  expect(container.textContent).not.toContain(pending.id)
  await click(container, 'التالي')
  expect(request(root + '?status=all&page=2&per_page=15')).toBeDefined()
  expect(container.querySelector('tbody td')?.textContent).toBe('16')
  const filter = container.querySelector('select')!
  expect([...filter.options].map(o => [o.value, o.textContent])).toEqual([
    ['all', 'الكل'], ['not_submitted', 'لم يُرسل الطلب'], ['pending', 'قيد المراجعة'], ['approved', 'معتمد'], ['rejected', 'مرفوض'],
  ])
  await select(filter, 'not_submitted')
  const filtered = root + '?status=not_submitted&page=1&per_page=15'
  expect(request(filtered)).toBeDefined()
  expect(container.querySelector('tbody')?.textContent).toContain('لم يقدّم')
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
  expect(fetchMock.mock.calls.filter(([url]) => url === filtered)).toHaveLength(2)
})

it('shows loading and errors without empty data or a zero total', async () => {
  let resolve!: (response: Response) => void
  fetchMock.mockImplementationOnce(() => new Promise(r => { resolve = r }))
  const container = await render()
  expect(container.textContent).toContain('جارٍ التحميل')
  expect(container.textContent).not.toContain('الإجمالي')
  expect(container.textContent).not.toContain('لا يوجد معالجون')
  await act(async () => resolve(json({}, 500)))
  expect(container.textContent).toContain('تعذّر التحميل')
  expect(container.textContent).not.toContain('لا يوجد معالجون')
  await click(container, 'إعادة المحاولة')
  expect(container.querySelector('tbody tr')).not.toBeNull()
})

it.each([
  ['super_admin', true, true],
  ['clinical_supervisor', true, false],
  ['admin', false, false],
] as const)('gates decisions, operational actions and private licences for %s', async (role, decision, documentAccess) => {
  auth.role = role
  const container = await render()
  const first = container.querySelector('tbody tr')!
  expect(!!button(first, 'قبول')).toBe(decision)
  expect(!!button(first, 'رفض')).toBe(decision)
  expect(!!button(first, 'تعليق')).toBe(decision)
  expect(!!button(first, 'طلب مستند')).toBe(documentAccess)
  expect(!!button(container, '+ دعوة معالج')).toBe(decision)
  expect(container.querySelectorAll('tbody tr')[1].querySelectorAll('button').length)
    .toBe(1 + Number(decision) + Number(documentAccess))
  expect(Array.from(container.querySelectorAll('tbody button')).filter(b => b.textContent === 'قبول')).toHaveLength(Number(decision))
  await click(first, 'عرض')
  expect(request(root + '/' + pending.id)?.method).toBe('GET')
  expect(dialog(container).textContent).toContain('نبذة تجريبية')
  expect(dialog(container).textContent).toContain('اضطرابات القلق')
  expect(dialog(container).textContent).toContain('لغة محفوظة')
  expect(!!button(dialog(container), 'عرض الرخصة')).toBe(decision)
})

it('loads the licence with Bearer auth and opens a non-cached blob URL', async () => {
  const endpoint = root + '/' + pending.id + '/license'
  fetchMock.mockImplementation(async url => url === endpoint
    ? new Response('fake PDF', { headers: { 'Content-Type': 'application/pdf' } })
    : defaultResponse(url))
  const replace = vi.fn()
  const tab = { closed: false, opener: window, location: { replace }, close: vi.fn() }
  vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
  const blob = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:licence')
  const container = await render()
  await click(container.querySelector('tbody tr')!, 'عرض')
  await click(dialog(container), 'عرض الرخصة')
  expect(request(endpoint)).toMatchObject({ method: 'GET', cache: 'no-store', headers: { Authorization: 'Bearer test-access-token' } })
  expect(blob.mock.calls[0][0]).toMatchObject({ type: 'application/pdf' })
  expect(replace).toHaveBeenCalledWith('blob:licence')
  expect(tab.opener).toBeNull()
})

it('confirms approval with an optional note and prevents double submission before refreshing', async () => {
  const endpoint = root + '/' + pending.id + '/approve'
  let resolve!: (response: Response) => void
  fetchMock.mockImplementation(async (url) => {
    if (url === endpoint) return new Promise(r => { resolve = r })
    return defaultResponse(url)
  })
  const container = await render()
  await click(container, 'قبول')
  expect(request(endpoint)).toBeUndefined()
  await input(dialog(container).querySelector('textarea')!, '  تمت المراجعة  ')
  const form = dialog(container).querySelector('form')!
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  expect(fetchMock.mock.calls.filter(([url]) => url === endpoint)).toHaveLength(1)
  expect(request(endpoint)).toMatchObject({ method: 'POST', body: JSON.stringify({ note: 'تمت المراجعة' }) })
  expect(button(form, 'جارٍ الإرسال…')?.disabled).toBe(true)
  await act(async () => resolve(json({ data: {} })))
  expect(container.querySelector('dialog')).toBeNull()
  expect(fetchMock.mock.calls.filter(([url]) => url.startsWith(root + '?'))).toHaveLength(2)
})

it('requires 3–1000 characters for rejection and sends the trimmed reason as note', async () => {
  const endpoint = root + '/' + pending.id + '/reject'
  fetchMock.mockImplementation(async url => url === endpoint ? json({ data: {} }) : defaultResponse(url))
  const container = await render()
  await click(container, 'رفض')
  for (const reason of ['', '  أب  ', 'س'.repeat(1001)]) {
    await input(dialog(container).querySelector('textarea')!, reason)
    await click(dialog(container), 'تأكيد')
    expect(dialog(container).textContent).toContain('أدخل سبب الرفض من 3 إلى 1000 حرف.')
    expect(request(endpoint)).toBeUndefined()
  }
  await input(dialog(container).querySelector('textarea')!, '  المستند غير واضح  ')
  await click(dialog(container), 'تأكيد')
  expect(request(endpoint)).toMatchObject({ method: 'POST', body: JSON.stringify({ note: 'المستند غير واضح' }) })
})

it.each([
  [409, 'already_decided', 'تم البت في هذا الطلب بالفعل.'],
  [422, 'not_submitted', 'لم يرسل المعالج طلب الاعتماد بعد.'],
  [422, 'license_missing', 'رخصة المعالج مفقودة أو غير صالحة.'],
  [403, undefined, 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'],
  [0, undefined, 'تعذّر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى.'],
] as const)('maps decision failures (%s %s) into Arabic', async (status, code, message) => {
  const endpoint = root + '/' + pending.id + '/approve'
  fetchMock.mockImplementation(async url => {
    if (url !== endpoint) return defaultResponse(url)
    if (!status) throw new TypeError('Offline')
    return json({ message: 'English server message', code }, status)
  })
  const container = await render()
  await click(container, 'قبول')
  await click(dialog(container), 'تأكيد')
  expect(dialog(container).querySelector('[role=alert]')?.textContent).toBe(message)
  expect(button(dialog(container), 'تأكيد')?.disabled).toBe(false)
})

it('uses the account and document endpoints with their exact payloads', async () => {
  const active = '/api/v1/admin/users/' + pending.id + '/active'
  const inactive = '/api/v1/admin/users/approved/active'
  const documents = '/api/v1/admin/documents'
  fetchMock.mockImplementation(async url => [active, inactive, documents].includes(url) ? json({}) : defaultResponse(url))
  const container = await render()
  await click(container, 'تعليق')
  expect(request(active)).toBeUndefined()
  await click(dialog(container), 'تأكيد')
  expect(request(active)).toMatchObject({ method: 'PATCH', body: '{"is_active":false}' })
  await click(container, 'تفعيل')
  await click(dialog(container), 'تأكيد')
  expect(request(inactive)).toMatchObject({ method: 'PATCH', body: '{"is_active":true}' })
  await click(container, 'طلب مستند')
  await select(dialog(container).querySelector('select')!, 'certificate')
  await input(dialog(container).querySelector('textarea')!, 'شهادة التدريب')
  await click(dialog(container), 'تأكيد')
  expect(request(documents)).toMatchObject({
    method: 'POST', body: JSON.stringify({ user_id: pending.id, doc_type: 'certificate', reason: 'شهادة التدريب' }),
    headers: { 'Idempotency-Key': expect.any(String) },
  })
})

it.each([false, true])('uses Arabic invite dropdowns and sends option codes (fallback=%s)', async fallback => {
  const endpoint = '/api/v1/admin/users'
  fetchMock.mockImplementation(async url => {
    if (url === endpoint) return json({}, 201)
    if (fallback && url === '/api/v1/meta/therapist-options') return json({}, 503)
    return defaultResponse(url)
  })
  const container = await render()
  await click(container, '+ دعوة معالج')
  const form = container.querySelector('form')!
  const [, specialty, country, languages] = [...form.querySelectorAll('select')]
  expect(specialty.options[1].textContent).toBe(fallback ? 'القلق' : 'اضطرابات القلق')
  expect(country.options[1].textContent).toBe('سوريا')
  expect(languages.multiple).toBe(true)
  expect(languages.options[1].textContent).toBe('الإنجليزية')
  await select(specialty, 'anxiety')
  await select(country, 'SY')
  await act(async () => {
    languages.options[0].selected = true
    languages.options[1].selected = true
    languages.dispatchEvent(new Event('change', { bubbles: true }))
  })
  for (const [label, value] of [['الاسم', 'معالج تجريبي'], ['البريد الإلكتروني', 'example@example.test'], ['رقم الواتساب', '0983321260']]) {
    await input(form.querySelector(`input[aria-label="${label}"]`)!, value)
  }
  await click(form, 'إرسال الدعوة')
  expect(JSON.parse(request(endpoint)!.body as string)).toMatchObject({
    role: 'therapist', therapist: { specialty: 'anxiety', country: 'SY', languages: ['ar', 'en'] },
  })
})

it('supports approval and status filtering in mock mode without making HTTP requests', async () => {
  vi.stubEnv('VITE_API_MOCK', 'true')
  const container = await render()
  await select(container.querySelector('select')!, 'pending')
  expect(container.querySelector('tbody')?.textContent).toContain('د. نور حسن')
  await click(container, 'قبول')
  await click(dialog(container), 'تأكيد')
  expect(container.textContent).toContain('لا يوجد معالجون بهذه الحالة.')
  await select(container.querySelector('select')!, 'approved')
  expect(container.querySelector('tbody')?.textContent).toContain('د. نور حسن')
  expect(fetchMock).not.toHaveBeenCalled()
})

// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ApiAdminTherapist, ApiAdminTherapistDetail, TherapistProfile, TherapistRevision } from '../api/types'
import type { Role } from '../types'
import { installDom, mount } from '../test/dom'

const auth = vi.hoisted(() => ({ role: 'super_admin' as Role }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ role: auth.role }) }))

const root = '/api/v1/admin/therapists'
const profile: TherapistProfile = {
  full_name: 'معالج تجريبي', job_title: 'معالج نفسي معتمد', specialty: 'anxiety', country: 'SY', city: 'دمشق',
  languages: ['ar', 'لغة محفوظة'], bio: 'نبذة تجريبية', years_of_experience: 6, email: 'profile@example.test',
}
const revision: TherapistRevision = {
  id: 'e3c2c984-7d09-4e20-a640-9b1b23346ca8', kind: 'initial', status: 'pending', submitted_at: '2026-04-02T12:15:00Z',
  data: { ...profile, bio: 'نبذة أولية مرسلة للمراجعة', years_of_experience: 0 },
}
const update: TherapistRevision = {
  ...revision, id: 'b07bde9e-268f-41f1-a1c9-dc012d9cd94d', kind: 'update',
  data: { ...profile, city: 'حلب', email: 'new@example.test' },
  changes: { city: { old: 'دمشق', new: 'حلب' }, email: { old: 'profile@example.test', new: 'new@example.test' } },
}
const pending: ApiAdminTherapistDetail = {
  ...profile, published: profile, pending_revision: revision, last_review: null,
  id: '6a0af6a3-0c12-4abb-8e86-f390a0b2e9db', full_name: 'معالج تجريبي', has_license: false, rating: 4.5,
  application_ref: 'APP-42',
  approval_status: 'pending', can_accept_new_clients: true, availability: { monday: ['09:00-12:00'] },
  clients_count: 5, clients_limit: 10, is_active: true, whatsapp_number: '+963983321260',
  created_at: '2026-04-01T12:15:00Z', approval_note: null, submitted_at: '2026-04-02T12:15:00Z',
}
const rows: ApiAdminTherapistDetail[] = [
  pending,
  { ...pending, id: 'legacy', full_name: 'ملف قديم', application_ref: null, has_license: true, pending_revision: null },
  { ...pending, id: 'not-submitted', full_name: 'لم يقدّم', application_ref: 'APP-43', approval_status: null, pending_revision: null, submitted_at: null },
  { ...pending, id: 'approved', full_name: 'حساب معلّق', application_ref: 'APP-44', pending_revision: update, approval_status: 'approved', is_active: false },
  { ...pending, id: 'rejected', full_name: 'طلب مرفوض', application_ref: 'APP-45', pending_revision: null, approval_status: 'rejected', approval_note: 'سبب تجريبي' },
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
  const detail = rows.find(row => url === root + '/' + row.id)
  if (detail) return json({ data: detail })
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
const dialog = (container: ParentNode) => Array.from(container.querySelectorAll('dialog')).at(-1)!
const openDetails = (container: ParentNode, index = 0) => click(container.querySelectorAll('tbody tr')[index], 'عرض')
const beginDecision = async (container: ParentNode, button: string, index = 0) => {
  await openDetails(container, index)
  await click(dialog(container), button)
}

it('passes status and page to the paginated API; auto-refreshes and displays Arabic states and row numbers', async () => {
  vi.useFakeTimers()
  fetchMock.mockImplementation(async url => {
    if (url.includes('page=2')) return page([rows[4]], 2, 2, 16)
    if (url.includes('status=not_submitted')) return page([rows[2]])
    return page(rows, 1, 2, 16)
  })
  const container = await render()
  expect(request(root + '?status=all&page=1&per_page=15')).toBeDefined()
  expect([...container.querySelectorAll('tbody tr')].map(tr => tr.children[3].textContent))
    .toEqual(['قيد المراجعة', 'قيد المراجعة', 'لم يُرسل الطلب', 'معتمدتعديلات بانتظار المراجعة', 'مرفوض'])
  expect(container.querySelectorAll('tbody tr')[0].children[1].textContent).toBe('APP-42')
  expect(container.querySelectorAll('tbody tr')[1].children[1].textContent).toBe('—')
  expect(container.textContent).not.toContain(pending.id)
  await click(container, 'التالي')
  expect(request(root + '?status=all&page=2&per_page=15')).toBeDefined()
  expect(container.querySelector('tbody td')?.textContent).toBe('16')
  const filter = container.querySelector('select')!
  expect([...filter.options].map(o => [o.value, o.textContent])).toEqual([
    ['all', 'الكل'], ['not_submitted', 'لم يُرسل الطلب'], ['pending', 'قيد المراجعة'], ['approved', 'معتمد'], ['rejected', 'مرفوض'],
    ['changes_pending', 'تعديلات بانتظار المراجعة'],
  ])
  await select(filter, 'not_submitted')
  const filtered = root + '?status=not_submitted&page=1&per_page=15'
  expect(request(filtered)).toBeDefined()
  expect(container.querySelector('tbody')?.textContent).toContain('لم يقدّم')
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
  expect(fetchMock.mock.calls.filter(([url]) => url === filtered)).toHaveLength(2)
})

it('passes trimmed q together with the pending-updates filter and resets the search to page one', async () => {
  fetchMock.mockImplementation(async url => {
    if (!url.startsWith(root + '?')) return defaultResponse(url)
    if (url.includes('&q=')) return page([rows[3]])
    if (url.includes('page=2')) return page([rows[3]], 2, 2, 16)
    return page([rows[3]], 1, 2, 16)
  })
  const container = await render()
  await select(container.querySelector('select')!, 'changes_pending')
  await click(container, 'التالي')
  expect(request(root + '?status=changes_pending&page=2&per_page=15')).toBeDefined()
  await input(container.querySelector('input[type=search]')!, '  app-44  ')
  await click(container, 'بحث')
  expect(request(root + '?status=changes_pending&page=1&per_page=15&q=app-44')).toBeDefined()
  expect(container.querySelector('tbody')?.textContent).toContain('حساب معلّق')
  await click(container, 'مسح البحث')
  expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(root + '?status=changes_pending&page=1&per_page=15')
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
  expect(button(first, 'قبول')).toBeUndefined()
  expect(button(first, 'رفض')).toBeUndefined()
  expect(!!button(first, 'تعليق')).toBe(decision)
  expect(!!button(first, 'طلب مستند')).toBe(documentAccess)
  expect(!!button(container, '+ دعوة معالج')).toBe(decision)
  expect(container.querySelectorAll('tbody tr')[1].querySelectorAll('button').length)
    .toBe(1 + Number(decision) + Number(documentAccess))
  await click(first, 'عرض')
  expect(request(root + '/' + pending.id)?.method).toBe('GET')
  expect(dialog(container).textContent).toContain('نبذة تجريبية')
  expect(dialog(container).textContent).toContain('اضطرابات القلق')
  expect(dialog(container).textContent).toContain('لغة محفوظة')
  expect(dialog(container).textContent).toContain('نبذة أولية مرسلة للمراجعة')
  expect(!!button(dialog(container), 'قبول')).toBe(decision)
  expect(!!button(dialog(container), 'رفض')).toBe(decision)
  expect(button(dialog(container), 'عرض الرخصة')).toBeUndefined()
  await click(dialog(container), 'إغلاق')
  await openDetails(container, 1)
  expect(button(dialog(container), 'قبول')).toBeUndefined()
  expect(!!button(dialog(container), 'عرض الرخصة')).toBe(decision)
})

it('loads the licence with Bearer auth and opens a non-cached blob URL', async () => {
  const endpoint = root + '/legacy/license'
  fetchMock.mockImplementation(async url => url === endpoint
    ? new Response('fake PDF', { headers: { 'Content-Type': 'application/pdf' } })
    : defaultResponse(url))
  const replace = vi.fn()
  const tab = { closed: false, opener: window, location: { replace }, close: vi.fn() }
  vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
  const blob = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:licence')
  const container = await render()
  await openDetails(container, 1)
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
  await beginDecision(container, 'قبول')
  expect(request(endpoint)).toBeUndefined()
  await input(dialog(container).querySelector('textarea')!, '  تمت المراجعة  ')
  const form = dialog(container).querySelector('form')!
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  expect(fetchMock.mock.calls.filter(([url]) => url === endpoint)).toHaveLength(1)
  expect(request(endpoint)).toMatchObject({ method: 'POST', body: JSON.stringify({ revision_id: revision.id, note: 'تمت المراجعة' }) })
  expect(button(form, 'جارٍ الإرسال…')?.disabled).toBe(true)
  await act(async () => resolve(json({ data: {} })))
  expect(container.querySelector('dialog')).toBeNull()
  expect(fetchMock.mock.calls.filter(([url]) => url.startsWith(root + '?'))).toHaveLength(2)
})

it('requires 3–1000 characters for rejection and sends the trimmed reason as note', async () => {
  const endpoint = root + '/' + pending.id + '/reject'
  fetchMock.mockImplementation(async url => url === endpoint ? json({ data: {} }) : defaultResponse(url))
  const container = await render()
  await beginDecision(container, 'رفض')
  for (const reason of ['', '  أب  ', 'س'.repeat(1001)]) {
    await input(dialog(container).querySelector('textarea')!, reason)
    await click(dialog(container), 'تأكيد')
    expect(dialog(container).textContent).toContain('أدخل سبب الرفض من 3 إلى 1000 حرف.')
    expect(request(endpoint)).toBeUndefined()
  }
  await input(dialog(container).querySelector('textarea')!, '  المستند غير واضح  ')
  await click(dialog(container), 'تأكيد')
  expect(request(endpoint)).toMatchObject({ method: 'POST', body: JSON.stringify({ revision_id: revision.id, note: 'المستند غير واضح' }) })
})

it.each([
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
  await beginDecision(container, 'قبول')
  await click(dialog(container), 'تأكيد')
  expect(dialog(container).querySelector('[role=alert]')?.textContent).toBe(message)
  expect(button(dialog(container), 'تأكيد')?.disabled).toBe(false)
})

it('compares a pending update with the published profile and approves only the reviewed revision', async () => {
  const endpoint = root + '/approved/approve'
  const nextRevision = { ...update, id: 'b9f045c3-259a-410a-902d-53b733fd5cb2' }
  let replaceRevision = false
  fetchMock.mockImplementation(async url => {
    if (url === endpoint) return json({})
    if (url === root + '/approved' && replaceRevision) return json({ data: { ...rows[3], pending_revision: nextRevision } })
    return defaultResponse(url)
  })
  const container = await render()
  await openDetails(container, 3)
  const details = dialog(container)
  const sections = details.querySelectorAll('section')
  expect(sections[0].textContent).toContain('الملف المهني المنشور')
  expect(sections[0].textContent).toContain('دمشق')
  expect(sections[0].textContent).not.toContain('حلب')
  expect(sections[1].textContent).toContain('تعديلات بانتظار المراجعة')
  const changed = Array.from(sections[1].querySelectorAll('[data-changed="true"]'))
  expect(changed).toHaveLength(2)
  const city = changed.find(field => field.querySelector('dt')?.textContent?.startsWith('المدينة'))
  const email = changed.find(field => field.querySelector('dt')?.textContent?.startsWith('البريد الإلكتروني'))
  expect(city?.textContent).toContain('القيمة المنشورةدمشق')
  expect(city?.textContent).toContain('القيمة المقترحةحلب')
  expect(email?.textContent).toContain('القيمة المقترحةnew@example.test')
  await click(details, 'قبول')
  replaceRevision = true
  await act(async () => { window.dispatchEvent(new Event('online')) })
  await click(dialog(container), 'تأكيد')
  expect(request(endpoint)).toMatchObject({ method: 'POST', body: JSON.stringify({ revision_id: update.id }) })
})

it.each([
  ['revision_superseded', 'أرسل المعالج نسخة أحدث، أعد فتح الطلب'],
  ['already_decided', 'تم البت في هذا الطلب بالفعل.'],
])('closes the stale review and reloads the roster on %s', async (code, message) => {
  const endpoint = root + '/' + pending.id + '/reject'
  const nextRevision = { ...revision, id: 'b9f045c3-259a-410a-902d-53b733fd5cb2', data: { ...revision.data, bio: 'نبذة النسخة الأحدث' } }
  let conflicted = false
  fetchMock.mockImplementation(async url => {
    if (url === endpoint) { conflicted = true; return json({ code }, 409) }
    if (url === root + '/' + pending.id && conflicted) {
      return json({ data: { ...pending, pending_revision: code === 'revision_superseded' ? nextRevision : null } })
    }
    return defaultResponse(url)
  })
  const container = await render()
  await beginDecision(container, 'رفض')
  await input(dialog(container).querySelector('textarea')!, 'البيانات غير مطابقة')
  await click(dialog(container), 'تأكيد')
  expect(container.querySelector('[role=alert]')?.textContent).toBe(message)
  expect(container.querySelector('dialog')).toBeNull()
  expect(fetchMock.mock.calls.filter(([url]) => url.startsWith(root + '?'))).toHaveLength(2)
  await openDetails(container)
  if (code === 'revision_superseded') expect(dialog(container).textContent).toContain('نبذة النسخة الأحدث')
  else expect(button(dialog(container), 'رفض')).toBeUndefined()
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

it('invites a therapist with only a name, WhatsApp and normalized reference, and displays a duplicate field error', async () => {
  const endpoint = '/api/v1/admin/users'
  fetchMock.mockImplementation(async url => {
    if (url === endpoint) return json({
      errors: { 'therapist.application_ref': ['رقم طلب التقديم مستخدم لمعالج آخر'] },
    }, 422)
    return defaultResponse(url)
  })
  const container = await render()
  await click(container, '+ دعوة معالج')
  const form = container.querySelector('form')!
  expect(form.querySelectorAll('input')).toHaveLength(3)
  expect(form.querySelectorAll('select')).toHaveLength(1)
  expect(form.textContent).toContain('رقم طلب التقديم')
  expect(request('/api/v1/meta/therapist-options')).toBeUndefined()
  for (const [label, value] of [['الاسم', 'معالج تجريبي'], ['رقم الواتساب', '0983321260']]) {
    await input(form.querySelector(`input[aria-label="${label}"]`)!, value)
  }
  const reference = form.querySelector('label input') as HTMLInputElement
  await click(form, 'إرسال الدعوة')
  expect(request(endpoint)).toBeUndefined()
  expect(form.querySelector('[role=alert]')?.textContent).toBe('رقم طلب التقديم مطلوب.')
  await input(reference, ' app-42 ')
  await click(form, 'إرسال الدعوة')
  expect(JSON.parse(request(endpoint)!.body as string)).toEqual({
    name: 'معالج تجريبي', whatsapp_number: '+963983321260', role: 'therapist', therapist: { application_ref: 'APP-42' },
  })
  expect(form.querySelector('[role=alert]')?.textContent).toBe('رقم طلب التقديم مستخدم لمعالج آخر')
})

it('supports approval and status filtering in mock mode without making HTTP requests', async () => {
  vi.stubEnv('VITE_API_MOCK', 'true')
  const container = await render()
  await select(container.querySelector('select')!, 'pending')
  expect(container.querySelector('tbody')?.textContent).toContain('د. نور حسن')
  await beginDecision(container, 'قبول')
  await click(dialog(container), 'تأكيد')
  expect(container.textContent).toContain('لا يوجد معالجون بهذه الحالة.')
  await select(container.querySelector('select')!, 'approved')
  expect(container.querySelector('tbody')?.textContent).toContain('د. نور حسن')
  expect(fetchMock).not.toHaveBeenCalled()
})

it.each(['قبول', 'رفض'])('updates only the approved profile on mock %s of changes', async decision => {
  vi.stubEnv('VITE_API_MOCK', 'true')
  const container = await render()
  await select(container.querySelector('select')!, 'changes_pending')
  await input(container.querySelector('input[type=search]')!, 'app-1001')
  await click(container, 'بحث')
  expect(container.querySelector('tbody')?.textContent).toContain('د. سارة أحمد')
  await beginDecision(container, decision)
  if (decision === 'رفض') await input(dialog(container).querySelector('textarea')!, 'المدينة تحتاج إلى تحقق')
  await click(dialog(container), 'تأكيد')
  expect(container.textContent).toContain('لا يوجد معالجون بهذه الحالة.')
  await select(container.querySelector('select')!, 'approved')
  await openDetails(container)
  const published = dialog(container).querySelector('section')
  expect(published?.textContent).toContain(decision === 'قبول' ? 'حلب' : 'دمشق')
  expect(published?.textContent).toContain('القلق')
  if (decision === 'رفض') expect(dialog(container).textContent).toContain('المدينة تحتاج إلى تحقق')
  expect(fetchMock).not.toHaveBeenCalled()
})

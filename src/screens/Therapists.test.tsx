// @vitest-environment happy-dom
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ApiAdminTherapist, ApiAdminTherapistDetail, TherapistProfile, TherapistRevision } from '../api/types'
import type { Role } from '../types'
import { installDom, mount } from '../test/dom'

const auth = vi.hoisted(() => ({ role: 'super_admin' as Role, userId: 'a' }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ role: auth.role, userId: auth.userId }) }))

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
  id: '6a0af6a3-0c12-4abb-8e86-f390a0b2e9db', full_name: 'معالج تجريبي', rating: 4.5, review_count: 0, activated: true, lifecycle_state: 'pending_review', allowed_actions: ['approve', 'reject', 'suspend'],
  application_ref: 'APP-42',
  approval_status: 'pending', can_accept_new_clients: true, availability: { monday: ['09:00-12:00'] },
  clients_count: 5, clients_limit: 10, is_active: true, whatsapp_number: '+963990000000',
  created_at: '2026-04-01T12:15:00Z', approval_note: null, submitted_at: '2026-04-02T12:15:00Z',
}
const rows: ApiAdminTherapistDetail[] = [
  pending,
  { ...pending, id: 'legacy', full_name: 'ملف قديم', application_ref: null, lifecycle_state: 'approved', approval_status: 'approved', allowed_actions: ['suspend'], pending_revision: null },
  { ...pending, id: 'not-submitted', full_name: 'لم يقدّم', application_ref: 'APP-43', approval_status: null, lifecycle_state: 'awaiting_profile', allowed_actions: ['suspend'], pending_revision: null, submitted_at: null },
  { ...pending, id: 'approved', full_name: 'حساب معلّق', application_ref: 'APP-44', pending_revision: update, approval_status: 'approved', lifecycle_state: 'update_pending', is_active: false },
  { ...pending, id: 'rejected', full_name: 'طلب مرفوض', application_ref: 'APP-45', pending_revision: null, approval_status: 'rejected', lifecycle_state: 'needs_changes', allowed_actions: ['suspend'], approval_note: 'سبب تجريبي' },
  { ...pending, id: 'invited', lifecycle_state: 'invited', activated: false, approval_status: null, pending_revision: null, allowed_actions: ['resend_invite', 'cancel_invite'] },
  { ...pending, id: 'suspended', lifecycle_state: 'suspended', is_active: true, approval_status: 'approved', pending_revision: null, allowed_actions: ['reactivate'] },
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
  auth.userId = 'a'
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
  await view.render(<MemoryRouter><Therapists /></MemoryRouter>)
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

it('passes lifecycle and page to the paginated API; auto-refreshes and displays Arabic states and row numbers', async () => {
  vi.useFakeTimers()
  fetchMock.mockImplementation(async url => {
    if (url.includes('page=2')) return page([rows[4]], 2, 2, 16)
    if (url.includes('lifecycle_state=awaiting_profile')) return page([rows[2]])
    return page(rows, 1, 2, 16)
  })
  const container = await render()
  expect(request(root + '?page=1&per_page=15')).toBeDefined()
  expect([...container.querySelectorAll('tbody tr')].map(tr => tr.children[3].firstElementChild?.textContent))
    .toEqual(['قيد المراجعة', 'معتمد', 'بانتظار الملف المهني', 'تعديلات بانتظار المراجعة', 'بحاجة إلى تعديل', 'بانتظار تفعيل الدعوة', 'معلّق'])
  expect(container.textContent).toContain('إجمالي المعالجين: 16')
  expect(container.textContent).toContain('الصفحة 1 من 2')
  expect(container.textContent).toContain('لا تقييمات')
  expect(button(container, 'تحديث القائمة')).toBeUndefined()
  expect(container.querySelectorAll('tbody tr')[0].children[2].textContent).toBe('APP-42')
  expect(container.querySelectorAll('tbody tr')[1].children[2].textContent).toBe('—')
  expect(container.textContent).not.toContain(pending.id)
  await click(container, 'التالي')
  expect(request(root + '?page=2&per_page=15')).toBeDefined()
  expect(container.querySelector('tbody td')?.textContent).toBe('16')
  const filter = container.querySelector('select')!
  expect([...filter.options].map(o => [o.value, o.textContent])).toEqual([
    ['', 'الكل'], ['invited', 'بانتظار تفعيل الدعوة'], ['awaiting_profile', 'بانتظار الملف المهني'],
    ['pending_review', 'قيد المراجعة'], ['needs_changes', 'بحاجة إلى تعديل'], ['approved', 'معتمد'],
    ['update_pending', 'تعديلات بانتظار المراجعة'], ['suspended', 'معلّق'],
  ])
  await select(filter, 'awaiting_profile')
  const filtered = root + '?lifecycle_state=awaiting_profile&page=1&per_page=15'
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
  await select(container.querySelector('select')!, 'update_pending')
  await click(container, 'التالي')
  expect(request(root + '?lifecycle_state=update_pending&page=2&per_page=15')).toBeDefined()
  await input(container.querySelector('input[type=search]')!, '  app-44  ')
  await click(container, 'بحث')
  expect(request(root + '?lifecycle_state=update_pending&page=1&per_page=15&q=app-44')).toBeDefined()
  expect(container.querySelector('tbody')?.textContent).toContain('حساب معلّق')
  await click(container, 'مسح البحث')
  expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(root + '?lifecycle_state=update_pending&page=1&per_page=15')
})

it('shows loading and errors without empty data or a zero total', async () => {
  let resolve!: (response: Response) => void
  fetchMock.mockImplementationOnce(() => new Promise(r => { resolve = r }))
  const container = await render()
  expect(container.textContent).toContain('جارٍ التحميل')
  expect(container.textContent).not.toContain('إجمالي المعالجين')
  expect(container.textContent).not.toContain('لا يوجد معالجون')
  await act(async () => resolve(json({}, 500)))
  expect(container.textContent).toContain('تعذّر التحميل')
  expect(container.textContent).not.toContain('لا يوجد معالجون')
  await click(container, 'إعادة المحاولة')
  expect(container.querySelector('tbody tr')).not.toBeNull()
})

it.each([
  ['super_admin', true], ['clinical_supervisor', true], ['admin', false],
] as const)('enforces the lifecycle action matrix for %s', async (role, canAct) => {
  auth.role = role
  const container = await render()
  const expected = [
    ['تعليق الحساب', 'قبول', 'رفض'], ['تعليق الحساب'], ['تعليق الحساب'], ['تعليق الحساب', 'قبول', 'رفض'],
    ['تعليق الحساب'], ['إعادة إرسال الدعوة', 'إلغاء الدعوة'], ['إعادة تفعيل الحساب'],
  ]
  const actions = [...new Set(expected.flat())]
  expect(button(container, '+ دعوة معالج')).toBeDefined()
  for (const [index, allowed] of expected.entries()) {
    const tr = container.querySelectorAll('tbody tr')[index]
    expect(actions.filter(label => !!button(tr, label))).toEqual(canAct ? actions.filter(label => allowed.includes(label) && !['قبول', 'رفض'].includes(label)) : [])
    await openDetails(container, index)
    expect(actions.filter(label => !!button(dialog(container), label))).toEqual(canAct ? actions.filter(label => allowed.includes(label)) : [])
    expect(button(dialog(container), 'عرض الرخصة')).toBeUndefined()
    expect(button(dialog(container), 'طلب مستند')).toBeUndefined()
    if (index === 0) {
      expect(request(root + '/' + pending.id)?.method).toBe('GET')
      expect(dialog(container).textContent).not.toContain(pending.id)
      expect(dialog(container).textContent).toContain('اضطرابات القلق')
      expect(dialog(container).textContent).toContain('لغة محفوظة')
      expect(dialog(container).textContent).toContain('نبذة أولية مرسلة للمراجعة')
      expect(dialog(container).textContent).toContain('تم التحقق')
      expect(dialog(container).textContent).not.toContain('الملف المهني المنشور')
      expect(dialog(container).textContent).not.toContain('القيمة المنشورة')
    }
    if (index === 5) expect(dialog(container).textContent).toContain('لم يتم التحقق')
    await click(dialog(container), 'إغلاق')
  }
})

it.each([[undefined], [null], [[]], [['view', 'unknown']]])('denies absent or unknown capability lists (%j)', async (allowed_actions) => {
  const row = { ...pending, allowed_actions }
  fetchMock.mockImplementation(async url => url.startsWith(root + '?') ? page([row])
    : url === root + '/' + row.id ? json({ data: row }) : defaultResponse(url))
  const container = await render()
  expect(container.querySelector('tbody tr')?.querySelectorAll('button')).toHaveLength(1)
  await openDetails(container)
  expect(button(dialog(container), 'قبول')).toBeUndefined()
  expect(button(dialog(container), 'تعليق الحساب')).toBeUndefined()
})

it('shows the latest approval note separately from an earlier rejection reason', async () => {
  const approved: ApiAdminTherapistDetail = {
    ...rows[1],
    last_review: {
      revision_id: update.id, kind: 'update', status: 'approved', note: 'الملف يطابق طلب التقديم',
      reviewed_at: '2026-04-04T12:15:00Z',
    },
    last_rejected_revision: { ...revision, status: 'rejected', review_note: 'البيانات السابقة غير مكتملة' },
  }
  fetchMock.mockImplementation(async url => url === root + '/' + approved.id ? json({ data: approved }) : defaultResponse(url))
  const container = await render()
  await openDetails(container, 1)
  const drawer = dialog(container)
  const note = Array.from(drawer.querySelectorAll('h3')).find(heading => heading.textContent === 'ملاحظة الموافقة')
  expect(note?.nextElementSibling?.textContent).toBe('الملف يطابق طلب التقديم')
  expect(drawer.textContent).toContain('سبب الرفض: البيانات السابقة غير مكتملة')
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
  expect(container.querySelectorAll('dialog')).toHaveLength(1)
  expect(fetchMock.mock.calls.filter(([url]) => url === root + '/' + pending.id)).toHaveLength(2)
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
  [403, undefined, 'ليس لديك صلاحية لتنفيذ هذا الإجراء. جرى تحديث البيانات.'],
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
  if (!status) expect(button(dialog(container), 'تأكيد')?.disabled).toBe(false)
})

it('compares a pending update with the published profile and approves only the reviewed revision', async () => {
  const endpoint = root + '/approved/approve'
  const nextRevision = { ...update, id: 'b9f045c3-259a-410a-902d-53b733fd5cb2' }
  let replaceRevision = false
  fetchMock.mockImplementation(async url => {
    if (url === endpoint) return json({})
    if (url === root + '/approved' && replaceRevision) return json({ data: { ...rows[3], pending_revision: nextRevision } })
    if (url.startsWith(root + '?') && replaceRevision) return page(rows.map(row => row.id === 'approved' ? { ...row, pending_revision: nextRevision } : row))
    return defaultResponse(url)
  })
  const container = await render()
  await openDetails(container, 3)
  const details = dialog(container)
  expect(details.textContent).toContain('تعديلات بانتظار المراجعة')
  const changed = Array.from(details.querySelectorAll('[data-changed="true"]'))
  expect(changed).toHaveLength(2)
  const city = changed.find(field => field.querySelector('dt')?.textContent?.startsWith('المدينة'))
  const email = changed.find(field => field.querySelector('dt')?.textContent?.startsWith('البريد الإلكتروني'))
  expect(city?.textContent).toContain('القيمة المنشورةدمشق')
  expect(city?.textContent).toContain('القيمة المقترحةحلب')
  expect(email?.textContent).toContain('القيمة المقترحةnew@example.test')
  await click(details, 'قبول')
  replaceRevision = true
  await act(async () => { window.dispatchEvent(new Event('focus')) })
  expect(container.querySelectorAll('dialog')).toHaveLength(1)
  expect(request(endpoint)).toBeUndefined()
  await click(dialog(container), 'قبول')
  await click(dialog(container), 'تأكيد')
  expect(request(endpoint)).toMatchObject({ method: 'POST', body: JSON.stringify({ revision_id: nextRevision.id }) })
})

it.each([
  ['revision_superseded', 'أرسل المعالج نسخة أحدث، أعد فتح الطلب'],
  ['already_decided', 'تم البت في هذا الطلب بالفعل.'],
])('dismisses the stale action and reloads detail and roster on %s', async (code, message) => {
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
  expect(container.querySelectorAll('dialog')).toHaveLength(1)
  expect(fetchMock.mock.calls.filter(([url]) => url === root + '/' + pending.id)).toHaveLength(2)
  expect(fetchMock.mock.calls.filter(([url]) => url.startsWith(root + '?'))).toHaveLength(2)
  if (code === 'revision_superseded') expect(dialog(container).textContent).toContain('نبذة النسخة الأحدث')
  else expect(button(dialog(container), 'رفض')).toBeUndefined()
})

it('uses the existing account and invitation endpoints with their exact payloads', async () => {
  const active = '/api/v1/admin/users/' + pending.id + '/active'
  const inactive = '/api/v1/admin/users/suspended/active'
  const invitation = '/api/v1/admin/users/invited/invitation'
  fetchMock.mockImplementation(async url => [active, inactive, invitation, invitation + '/resend'].includes(url) ? json({}) : defaultResponse(url))
  const container = await render()
  await click(container, 'تعليق الحساب')
  expect(request(active)).toBeUndefined()
  await click(dialog(container), 'تأكيد')
  expect(request(active)).toMatchObject({ method: 'PATCH', body: '{"is_active":false}' })
  await click(container, 'إعادة تفعيل الحساب')
  await click(dialog(container), 'تأكيد')
  expect(request(inactive)).toMatchObject({ method: 'PATCH', body: '{"is_active":true}' })
  await click(container, 'إعادة إرسال الدعوة')
  await click(dialog(container), 'تأكيد')
  expect(request(invitation + '/resend')).toMatchObject({ method: 'POST' })
  await click(container, 'إلغاء الدعوة')
  await click(dialog(container), 'تأكيد')
  expect(request(invitation)).toMatchObject({ method: 'DELETE' })
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
  for (const [label, value] of [['الاسم', 'معالج تجريبي'], ['رقم الواتساب', '0990000000']]) {
    await input(form.querySelector(`input[aria-label="${label}"]`)!, value)
  }
  const reference = form.querySelector('label input') as HTMLInputElement
  await click(form, 'إرسال الدعوة')
  expect(request(endpoint)).toBeUndefined()
  expect(form.querySelector('[role=alert]')?.textContent).toBe('رقم طلب التقديم مطلوب.')
  await input(reference, ' app-42 ')
  await click(form, 'إرسال الدعوة')
  expect(JSON.parse(request(endpoint)!.body as string)).toEqual({
    name: 'معالج تجريبي', whatsapp_number: '+963990000000', role: 'therapist', therapist: { application_ref: 'APP-42' },
  })
  expect(form.querySelector('[role=alert]')?.textContent).toBe('رقم طلب التقديم مستخدم لمعالج آخر')
})

it('supports approval and status filtering in mock mode without making HTTP requests', async () => {
  vi.stubEnv('VITE_API_MOCK', 'true')
  const container = await render()
  await select(container.querySelector('select')!, 'pending_review')
  expect(container.querySelector('tbody')?.textContent).toContain('د. نور حسن')
  await beginDecision(container, 'قبول')
  await click(dialog(container), 'تأكيد')
  expect(container.textContent).toContain('لا يوجد معالجون مطابقون.')
  await select(container.querySelector('select')!, 'approved')
  expect(container.querySelector('tbody')?.textContent).toContain('د. نور حسن')
  expect(fetchMock).not.toHaveBeenCalled()
})

it.each(['قبول', 'رفض'])('updates only the approved profile on mock %s of changes', async decision => {
  vi.stubEnv('VITE_API_MOCK', 'true')
  const container = await render()
  await select(container.querySelector('select')!, 'update_pending')
  await input(container.querySelector('input[type=search]')!, 'app-1001')
  await click(container, 'بحث')
  expect(container.querySelector('tbody')?.textContent).toContain('د. سارة أحمد')
  await beginDecision(container, decision)
  if (decision === 'رفض') await input(dialog(container).querySelector('textarea')!, 'المدينة تحتاج إلى تحقق')
  await click(dialog(container), 'تأكيد')
  expect(container.textContent).toContain('لا يوجد معالجون مطابقون.')
  await click(dialog(container), 'إغلاق')
  await select(container.querySelector('select')!, 'approved')
  await openDetails(container)
  const published = Array.from(dialog(container).querySelectorAll('h3')).find(h => h.textContent === 'الملف المهني المنشور')?.parentElement
  expect(published?.textContent).toContain(decision === 'قبول' ? 'حلب' : 'دمشق')
  expect(published?.textContent).toContain('القلق')
  if (decision === 'رفض') {
    expect(dialog(container).textContent).toContain('المدينة تحتاج إلى تحقق')
    expect(dialog(container).textContent).toContain('آخر نسخة مرفوضة')
  }
  expect(fetchMock).not.toHaveBeenCalled()
})

it('shows both refresh indicators and dismisses a row confirmation on lifecycle change', async () => {
  let resolveList!: (response: Response) => void
  let resolveDetail!: (response: Response) => void
  const container = await render()
  await openDetails(container)
  fetchMock.mockImplementation(async url => {
    if (url.startsWith(root + '?')) return new Promise(r => { resolveList = r })
    if (url === root + '/' + pending.id) return new Promise(r => { resolveDetail = r })
    return defaultResponse(url)
  })
  await act(async () => { window.dispatchEvent(new Event('focus')) })
  expect(container.textContent).toContain('جارٍ تحديث القائمة')
  expect(dialog(container).textContent).toContain('جارٍ تحديث التفاصيل')
  expect(button(dialog(container), 'قبول')?.disabled).toBe(true)
  await act(async () => { resolveList(page(rows)); resolveDetail(json({ data: pending })) })
  await click(dialog(container), 'إغلاق')
  await click(container, 'تعليق الحساب')
  await act(async () => { window.dispatchEvent(new Event('focus')) })
  expect(button(dialog(container), 'تأكيد')?.disabled).toBe(true)
  await act(async () => resolveList(page([{ ...pending, lifecycle_state: 'suspended', allowed_actions: ['reactivate'] }, ...rows.slice(1)])))
  expect(container.querySelector('dialog')).toBeNull()
})

it('dismisses the confirmation when the actor changes even if the role stays the same', async () => {
  const container = await render()
  await beginDecision(container, 'قبول')
  expect(container.querySelectorAll('dialog')).toHaveLength(2)
  auth.userId = 'b'
  const { default: Therapists } = await import('./Therapists')
  await view!.render(<MemoryRouter><Therapists /></MemoryRouter>)
  expect(container.querySelectorAll('dialog')).toHaveLength(1)
  expect(request(root + '/' + pending.id + '/approve')).toBeUndefined()
})

// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { installDom, mount } from '../test/dom'

const services = vi.hoisted(() => ({
  listFaqs: vi.fn(),
  createFaq: vi.fn(),
  updateFaq: vi.fn(),
  deleteFaq: vi.fn(),
}))

vi.mock('../services/data', () => services)

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_API_URL', '')
  vi.stubEnv('VITE_API_MOCK', 'false')
  installDom()
  services.listFaqs.mockReset().mockRejectedValue(new Error('faq fetch failed'))
})

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('shows the shared error state when a list screen fails to load', async () => {
  const { default: Faqs } = await import('./Faqs')
  const view = mount()
  await view.render(<MemoryRouter><Faqs /></MemoryRouter>)

  expect(view.container.textContent).toContain('تعذّر التحميل')
  expect(view.container.textContent).toContain('إعادة المحاولة')
  expect(view.container.textContent).not.toContain('لا توجد بيانات.')
  await view.unmount()
})

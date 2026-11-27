// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { installDom, mount } from '../test/dom'
import { json } from '../test/storage'

afterEach(() => vi.unstubAllGlobals())

it('offers recovery without claiming a neutral response confirms WhatsApp delivery', async () => {
  installDom()
  const transport = vi.fn().mockResolvedValue(json({ message: 'legacy server claimed delivery' }))
  vi.stubGlobal('fetch', transport)
  const { default: ForgotPassword } = await import('./ForgotPassword')
  const view = mount()
  try {
    await view.render(<MemoryRouter><ForgotPassword /></MemoryRouter>)
    const phone = view.container.querySelector('input')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(phone), 'value')!.set!.call(phone, '0990000000')
      phone.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => view.container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(transport).toHaveBeenCalledTimes(1)
    expect(view.container.textContent).toContain('إذا كان الرقم مؤهلاً، قد يصلك رمز الاستعادة على واتساب.')
    expect(view.container.textContent).not.toContain('legacy server claimed delivery')
    expect(view.container.querySelector('[aria-label="رمز الاستعادة"]')).not.toBeNull()
  } finally {
    await view.unmount()
  }
})

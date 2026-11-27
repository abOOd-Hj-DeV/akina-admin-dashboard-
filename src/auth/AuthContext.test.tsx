// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { installDom, mount } from '../test/dom'
import { json } from '../test/storage'

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_API_MOCK', 'false')
  installDom()
  sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it.each([200, 500])('keeps the newly signed-in account visible when old logout returns %s', async (status) => {
  const [{ AuthProvider, useAuth }, { tokenStore }] = await Promise.all([
    import('./AuthContext'),
    import('../api/client'),
  ])
  const reply = (id: string) => json({ user: { id, name: id, role: 'admin' }, access_token: `access-${id}`, refresh_token: `refresh-${id}` })
  let finishLogout!: (response: Response) => void
  const fetch = vi.fn()
    .mockResolvedValueOnce(reply('A'))
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishLogout = resolve }))
    .mockResolvedValueOnce(reply('B'))
  vi.stubGlobal('fetch', fetch)
  let auth!: ReturnType<typeof useAuth>
  function Identity() {
    auth = useAuth()
    return <span>{auth.userName ?? 'signed-out'}</span>
  }
  const view = mount()
  try {
    await view.render(<AuthProvider><Identity /></AuthProvider>)
    await act(async () => { await auth.apiLogin('+963990000000', 'test-only1') })
    expect(view.container.textContent).toBe('A')
    await act(async () => auth.logout())
    expect(view.container.textContent).toBe('signed-out')
    await act(async () => { await auth.apiLogin('+963990000001', 'test-only2') })
    await act(async () => finishLogout(json({}, status)))
    expect(view.container.textContent).toBe('B')
    expect(tokenStore.getRefresh()).toBe('refresh-B')
    expect(fetch).toHaveBeenCalledTimes(3)
  } finally {
    await view.unmount()
  }
})

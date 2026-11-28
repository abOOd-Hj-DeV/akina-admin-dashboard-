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

it('blocks protected content while offline and restores on the online event', async () => {
  const [{ AuthProvider, useAuth }, { default: SessionRecovery }] = await Promise.all([
    import('./AuthContext'),
    import('../components/SessionRecovery'),
  ])
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  sessionStorage.setItem('sakina-refresh', 'old-refresh')
  sessionStorage.setItem('sakina-user-name', 'old name must not be rendered')
  const user = { id: 'staff', name: 'confirmed account', role: 'admin' }
  const fetch = vi.fn()
    .mockResolvedValueOnce(json({ access_token: 'new-access', refresh_token: 'new-refresh' }))
    .mockResolvedValueOnce(json({ user }))
  vi.stubGlobal('fetch', fetch)
  function ProtectedContent() {
    const auth = useAuth()
    return auth.ready && auth.role ? <span>{auth.userName}</span> : <SessionRecovery />
  }
  const view = mount()
  try {
    await view.render(<AuthProvider><ProtectedContent /></AuthProvider>)
    expect(view.container.textContent).toContain('تعذّر التحقق من الجلسة مؤقتاً')
    expect(view.container.textContent).not.toContain('old name must not be rendered')
    expect(sessionStorage.getItem('sakina-refresh')).toBe('old-refresh')
    expect(fetch).not.toHaveBeenCalled()
    online.mockReturnValue(true)
    await act(async () => window.dispatchEvent(new Event('online')))
    expect(view.container.textContent).toBe('confirmed account')
    expect(fetch).toHaveBeenCalledTimes(2)
  } finally {
    vi.restoreAllMocks()
    await view.unmount()
  }
})

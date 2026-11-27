// @vitest-environment happy-dom
import { act, useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installDom, mount } from '../test/dom'
import { useAsync } from './useAsync'

let resource!: ReturnType<typeof useAsync<number>>
let browser: ReturnType<typeof installDom>

function Probe({ fn, interval = 0 }: { fn: () => Promise<number>; interval?: number }) {
  const state = useAsync(fn, [], { interval })
  useEffect(() => { resource = state }, [state])
  return <output>{state.data ?? 'missing'}</output>
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

beforeEach(() => {
  browser = installDom()
})

afterEach(async () => {
  vi.useRealTimers()
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('useAsync', () => {
  it('keeps prior data while refreshing on focus', async () => {
    const refresh = deferred<number>()
    const fn = vi.fn()
      .mockResolvedValueOnce(7)
      .mockReturnValueOnce(refresh.promise)
    const view = mount()
    await view.render(<Probe fn={fn} />)

    expect(view.container.textContent).toBe('7')
    act(() => { browser.dispatchEvent(new browser.Event('focus')) })
    expect(resource.data).toBe(7)
    expect(resource.loading).toBe(false)
    expect(resource.refreshing).toBe(true)

    await act(async () => { refresh.resolve(8); await refresh.promise })
    expect(view.container.textContent).toBe('8')
    expect(resource.refreshing).toBe(false)
    await view.unmount()
  })

  it('catches reload errors and ignores stale responses', async () => {
    const first = deferred<number>()
    const second = deferred<number>()
    const fn = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockRejectedValueOnce(new Error('refresh failed'))
    const view = mount()
    await view.render(<Probe fn={fn} />)

    act(() => { browser.dispatchEvent(new browser.Event('focus')) })
    await act(async () => { second.resolve(2); await second.promise })
    await act(async () => { first.resolve(1); await first.promise })
    expect(resource.data).toBe(2)

    await act(async () => { await expect(resource.reload()).resolves.toBeUndefined() })
    expect(resource.data).toBe(2)
    expect(resource.error?.message).toBe('refresh failed')
    await view.unmount()
  })

  it('polls on the configured interval', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
    const view = mount()
    await view.render(<Probe fn={fn} interval={15_000} />)
    expect(view.container.textContent).toBe('1')

    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
    expect(view.container.textContent).toBe('2')
    expect(fn).toHaveBeenCalledTimes(2)
    await view.unmount()
  })
})

import { useCallback, useEffect, useRef, useState } from 'react'

/** hook بسيط لتغليف استدعاءات الخدمات في الشاشات */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  { interval = 30_000 }: { interval?: number } = {},
) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const dataRef = useRef<T | undefined>(undefined)
  const requestId = useRef(0)
  const inFlight = useRef(false)
  const runRef = useRef<(background?: boolean) => Promise<void>>(async () => {})
  const previousDeps = useRef<unknown[] | null>(null)

  runRef.current = async (background = false) => {
    if (background && inFlight.current) return

    const id = ++requestId.current
    const hasData = dataRef.current !== undefined
    inFlight.current = true
    if (!background || !hasData) setLoading(!hasData)
    if (hasData) setRefreshing(true)

    try {
      const result = await fn()
      if (id !== requestId.current) return
      dataRef.current = result
      setData(result)
      setError(null)
    } catch (cause) {
      if (id === requestId.current) {
        setError(cause instanceof Error ? cause : new Error(String(cause)))
      }
    } finally {
      if (id === requestId.current) {
        inFlight.current = false
        setLoading(false)
        setRefreshing(false)
      }
    }
  }

  const reload = useCallback(() => runRef.current(false), [])

  useEffect(() => {
    const changed = previousDeps.current !== null && (
      previousDeps.current.length !== deps.length
      || previousDeps.current.some((value, index) => !Object.is(value, deps[index]))
    )
    previousDeps.current = [...deps]
    if (changed) {
      dataRef.current = undefined
      setData(undefined)
      setError(null)
    }

    let active = true
    const run = (background = true) => {
      if (active) void runRef.current(background)
    }
    const onFocus = () => {
      if (document.visibilityState === 'visible') run()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') run()
    }
    const onOnline = () => run()

    run(false)
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibilityChange)
    const timer = interval > 0
      ? window.setInterval(() => {
          if (document.visibilityState === 'visible') run()
        }, interval)
      : undefined

    return () => {
      active = false
      requestId.current += 1
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (timer !== undefined) window.clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, interval])

  return { data, loading, refreshing, error, reload }
}

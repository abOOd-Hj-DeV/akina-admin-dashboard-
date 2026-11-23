import { vi } from 'vitest'

/** Storage بسيط في الذاكرة لبيئة node */
export function memoryStorage(): Storage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    get length() { return map.size },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
  }
}

export function stubBrowser() {
  const local = memoryStorage()
  const session = memoryStorage()
  const events: string[] = []
  vi.stubGlobal('localStorage', local)
  vi.stubGlobal('sessionStorage', session)
  vi.stubGlobal('window', { dispatchEvent: (e: Event) => { events.push(e.type); return true } })
  return { local, session, events }
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

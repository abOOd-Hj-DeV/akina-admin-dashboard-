import { afterEach, describe, expect, it, vi } from 'vitest'

async function load(url: string, mock: string) {
  vi.resetModules()
  vi.stubEnv('VITE_API_URL', url)
  vi.stubEnv('VITE_API_MOCK', mock)
  return import('./client')
}

afterEach(() => vi.unstubAllEnvs())

describe('اختيار مصدر البيانات', () => {
  it.each([
    ['', '', true],
    ['', 'true', true],
    ['', 'false', false],
    ['http://localhost:8000', '', false],
    ['http://localhost:8000', 'false', false],
    ['http://localhost:8000', 'true', true],
  ])('VITE_API_URL=%j VITE_API_MOCK=%j → mock=%j', async (url, mock, expected) => {
    expect((await load(url, mock)).API_MOCK).toBe(expected)
  })
})

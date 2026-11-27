import { expect, it } from 'vitest'
import { formatAdminDate, localizeAdminTimestamps } from './format-date'

it('formats zoned timestamps in Arabic in Damascus, including rollover', () => {
  const date = formatAdminDate('2026-04-30T22:05:00.000Z')
  expect(date).toContain('1 أيار 2026')
  expect(date).toContain('1:05')
  expect(date).toBe(formatAdminDate('2026-05-01T00:05:00+02:00'))
  expect(date).not.toMatch(/T22|Z/)
})

it('preserves date-only and zoneless wall-clock semantics', () => {
  expect(formatAdminDate('2026-04-30')).toBe('30 نيسان 2026')
  expect(formatAdminDate('2026-04-30 22:05:15')).toContain('10:05')
  expect(formatAdminDate('منذ 10 دقائق')).toBe('منذ 10 دقائق')
  expect(formatAdminDate('30 نيسان، 10:05 م')).toBe('30 نيسان، 10:05 م')
})

it.each([null, undefined, '', 'Invalid Date', '2026-02-30', '2026-13-01', '2026-04-01T25:00:00Z', '2026-04-10Tbroken'])(
  'renders a dash for missing or malformed dates (%s)', value => {
    expect(formatAdminDate(value)).toBe('—')
  },
)

it('formats embedded audit timestamps without changing surrounding text', () => {
  const stamp = '2026-04-30T22:05:00Z'
  expect(localizeAdminTimestamps(`تم الحفظ — ${stamp}: بنجاح`)).toBe(`تم الحفظ — ${formatAdminDate(stamp)}: بنجاح`)
})

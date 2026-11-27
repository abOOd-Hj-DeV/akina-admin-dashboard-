const locale = 'ar-SY-u-nu-latn'
const dateFields = { year: 'numeric', month: 'long', day: 'numeric' } as const
const dateAndClock = { ...dateFields, hour: 'numeric', minute: '2-digit' } as const
const dateOnly = new Intl.DateTimeFormat(locale, { ...dateFields, timeZone: 'UTC' })
const wallClock = new Intl.DateTimeFormat(locale, { ...dateAndClock, timeZone: 'UTC' })
const platformClock = new Intl.DateTimeFormat(locale, { ...dateAndClock, timeZone: 'Asia/Damascus' })
const dateValue = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})?)?$/i
const embeddedTimestamp = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?\b/gi

export function formatAdminDate(value: string | null | undefined): string {
  const text = value?.trim()
  if (!text || /^(?:invalid date|null|undefined|nan)$/i.test(text)) return '—'
  const match = dateValue.exec(text)
  if (!match) return /^\d{4}-\d{1,2}(?:-|$)/.test(text) ? '—' : value ?? text

  const [, day, time, zone] = match
  const calendarDate = new Date(`${day}T00:00:00Z`)
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== day || day.startsWith('0000')) return '—'
  if (!time) return dateOnly.format(calendarDate)
  if (time.startsWith('24:')) return '—'
  const instant = new Date(`${day}T${time}${zone ?? 'Z'}`)
  if (!Number.isFinite(instant.getTime())) return '—'
  return (zone ? platformClock : wallClock).format(instant)
}

export function localizeAdminTimestamps(text: string): string {
  return text.replace(embeddedTimestamp, formatAdminDate)
}

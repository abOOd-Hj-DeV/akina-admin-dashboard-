const redFlagDateFormatter = new Intl.DateTimeFormat('ar-SY-u-nu-latn', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Damascus',
})

export function formatRedFlagDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : redFlagDateFormatter.format(date)
}

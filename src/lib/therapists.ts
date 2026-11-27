export const THERAPIST_STATUS = {
  not_submitted: 'لم يُرسل الطلب',
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
} as const

const dateFormat = new Intl.DateTimeFormat('ar-SY', { dateStyle: 'medium', timeZone: 'Asia/Damascus' })

export function therapistDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date)
}

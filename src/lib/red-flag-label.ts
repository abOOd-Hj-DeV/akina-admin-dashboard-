export function redFlagPriority(priority: string) {
  switch (priority) {
    case 'high': return { label: 'عالية', tone: 'red' } as const
    case 'medium': return { label: 'متوسطة', tone: 'amber' } as const
    case 'low': return { label: 'منخفضة', tone: 'blue' } as const
    default: return { label: 'غير معروفة', tone: 'gray' } as const
  }
}
const typeLabels: Record<string, string> = {
  low_mood: 'درجة اكتئاب أو قلق مرتفعة',
  non_compliance: 'عدم التزام بالخطة العلاجية',
}

export function redFlagLabel(type: string, source?: string | null): string {
  if (type !== 'safety') return typeLabels[type] ?? 'تنبيه سريري'
  switch (source) {
    case 'assessment': return 'إشارة سلامة من تقييم'
    case 'manual_support': return 'طلب دعم عاجل من التطبيق'
    default: return 'بلاغ سلامة يحتاج إلى مراجعة'
  }
}

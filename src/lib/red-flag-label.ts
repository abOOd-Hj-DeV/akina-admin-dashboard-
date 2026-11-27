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

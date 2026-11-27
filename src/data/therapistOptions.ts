import type { TherapistOptions } from '../api/types'

const options = (entries: [string, string][]) => entries.map(([code, name_ar]) => ({ code, name_ar }))

export const THERAPIST_OPTIONS: TherapistOptions = {
  countries: options([
    ['SY', 'سوريا'], ['LB', 'لبنان'], ['JO', 'الأردن'], ['PS', 'فلسطين'], ['IQ', 'العراق'],
    ['SA', 'السعودية'], ['AE', 'الإمارات'], ['QA', 'قطر'], ['KW', 'الكويت'], ['BH', 'البحرين'],
    ['OM', 'عُمان'], ['YE', 'اليمن'], ['EG', 'مصر'], ['SD', 'السودان'], ['LY', 'ليبيا'],
    ['TN', 'تونس'], ['DZ', 'الجزائر'], ['MA', 'المغرب'], ['MR', 'موريتانيا'], ['SO', 'الصومال'],
    ['DJ', 'جيبوتي'], ['KM', 'جزر القمر'], ['TR', 'تركيا'], ['DE', 'ألمانيا'],
    ['GB', 'المملكة المتحدة'], ['US', 'الولايات المتحدة'], ['CA', 'كندا'], ['FR', 'فرنسا'],
    ['SE', 'السويد'], ['NL', 'هولندا'],
  ]),
  languages: options([
    ['ar', 'العربية'], ['en', 'الإنجليزية'], ['fr', 'الفرنسية'],
    ['tr', 'التركية'], ['ku', 'الكردية'], ['de', 'الألمانية'],
  ]),
  specialties: options([
    ['anxiety', 'القلق'], ['depression', 'الاكتئاب'], ['trauma', 'الصدمات النفسية واضطراب ما بعد الصدمة'],
    ['couples_family', 'العلاج الزوجي والأسري'], ['children_adolescents', 'الأطفال والمراهقون'],
    ['addiction', 'الإدمان'], ['ocd', 'الوسواس القهري'], ['general', 'الصحة النفسية العامة'],
  ]),
}

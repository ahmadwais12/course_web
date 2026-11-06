import type { AIModule } from '@/lib/ai/modules';
import type { Language } from '@/lib/i18n';

type Suggestion = { module: AIModule; text: Record<Language, string> };

const SUGGESTIONS: Suggestion[] = [
  {
    module: 'platform_support',
    text: { en: 'How do I add a new student?', dr: 'چطور یک شاگرد جدید اضافه کنم؟', ps: 'څنګه نوی زده‌کوونکی اضافه کړم؟' },
  },
  {
    module: 'academic',
    text: { en: 'How many active students do we have?', dr: 'چند شاگرد فعال داریم؟', ps: 'موږ څومره فعال زده‌کوونکي لرو؟' },
  },
  {
    module: 'academic',
    text: {
      en: 'Show attendance for this month by class',
      dr: 'حاضری این ماه را به تفکیک صنف نشان بده',
      ps: 'د دې میاشتې حاضري د ټولګي له مخې وښایه',
    },
  },
  {
    module: 'academic',
    text: {
      en: 'Which students have attendance below 75%?',
      dr: 'کدام شاگردان حاضری کمتر از ۷۵٪ دارند؟',
      ps: 'کوم زده‌کوونکي له ۷۵٪ څخه کمه حاضري لري؟',
    },
  },
  {
    module: 'finance',
    text: { en: 'What is our revenue this month?', dr: 'عواید این ماه ما چقدر است؟', ps: 'زموږ د دې میاشتې عواید څومره دي؟' },
  },
  {
    module: 'finance',
    text: { en: 'How much is unpaid in student fees?', dr: 'چقدر فیس شاگردان پرداخت نشده است؟', ps: 'د زده‌کوونکو څومره فیس نه دی ورکړل شوی؟' },
  },
  {
    module: 'hr',
    text: { en: 'How many employees are absent today?', dr: 'امروز چند کارمند غیرحاضر است؟', ps: 'نن څومره کارکوونکي غیرحاضر دي؟' },
  },
  {
    module: 'payroll',
    text: { en: 'Summarize payroll for last month', dr: 'خلاصه معاشات ماه گذشته را بده', ps: 'د تېرې میاشتې د معاشونو لنډیز راکړه' },
  },
  {
    module: 'inventory',
    text: { en: 'Which items are low in stock?', dr: 'کدام اقلام موجودی کم دارند؟', ps: 'کوم توکي لږ موجودي لري؟' },
  },
  {
    module: 'reports',
    text: {
      en: 'Compare this month with last month',
      dr: 'این ماه را با ماه گذشته مقایسه کن',
      ps: 'دا میاشت له تېرې میاشتې سره پرتله کړه',
    },
  },
];

export function getSuggestions(allowedModules: AIModule[], language: Language, limit = 6): string[] {
  return SUGGESTIONS.filter((s) => s.module === 'platform_support' || allowedModules.includes(s.module))
    .slice(0, limit)
    .map((s) => s.text[language] ?? s.text.en);
}

import type { Language } from '@/lib/i18n';

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  dr: 'Dari (Afghan Persian)',
  ps: 'Pashto',
};

const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g;
/** Letters used in Pashto but not in Dari. */
const PASHTO_LETTERS = /[ټډړږښګڼېۍځڅ]/;
const PASHTO_WORDS = /(^|[\s،؟?.!])(زموږ|څنګه|څومره|کوم|وکړم|کړم|دي|په|سره|نن)(?=$|[\s،؟?.!])/;

/** Detect the language of a question (English / Dari / Pashto). Falls back to `fallback` for empty text. */
export function detectLanguage(text: string, fallback: Language = 'en'): Language {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return fallback;
  const arabic = (text.match(ARABIC_SCRIPT) ?? []).length;
  if (arabic / letters.length < 0.3) return 'en';
  if (PASHTO_LETTERS.test(text) || PASHTO_WORDS.test(text)) return 'ps';
  return 'dr';
}

export function isRtlLanguage(lang: Language) {
  return lang === 'dr' || lang === 'ps';
}

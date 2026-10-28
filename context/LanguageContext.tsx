'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations } from '@/lib/i18n';

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations['en'];
  isRTL: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('emis-language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'dr' || savedLang === 'ps')) {
      setLangState(savedLang);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('emis-language', newLang);
  };

  const t = translations[lang];
  const isRTL = lang === 'dr' || lang === 'ps';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className={isRTL ? 'font-arabic' : undefined}
        suppressHydrationWarning
      >
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

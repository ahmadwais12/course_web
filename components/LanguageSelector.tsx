'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { usePortsMotion } from '@/components/ports/motion';

interface LanguageSelectorProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  variant?: 'ghost' | 'outline' | 'filled';
  /** Where the menu opens relative to the trigger */
  placement?: 'bottom' | 'top';
}

const languages: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'dr', label: 'Dari', native: 'دری' },
  { code: 'ps', label: 'Pashto', native: 'پښتو' },
];

export default function LanguageSelector({
  currentLang,
  onLanguageChange,
  variant = 'ghost',
  placement = 'bottom',
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { pop } = usePortsMotion();
  const selectedLang = languages.find((l) => l.code === currentLang) || languages[0];
  const menuDir = currentLang === 'dr' || currentLang === 'ps' ? 'rtl' : 'ltr';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Always close when the active language changes (covers parent-driven updates too)
  useEffect(() => {
    setIsOpen(false);
  }, [currentLang]);

  const pick = (code: Language) => {
    setIsOpen(false);
    if (code !== currentLang) onLanguageChange(code);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        dir="ltr"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all duration-200',
          variant === 'ghost' && 'text-muted-foreground hover:bg-muted',
          variant === 'outline' && 'border border-border text-foreground hover:border-primary',
          variant === 'filled' && 'bg-muted text-foreground hover:bg-muted/80',
          isOpen && 'border-primary ring-2 ring-ring/20'
        )}
      >
        <Globe size={18} className="shrink-0 text-primary" />
        <span className="hidden sm:inline">{selectedLang.native}</span>
        <span className="uppercase sm:hidden">{selectedLang.code}</span>
        <ChevronDown
          size={14}
          className={cn('shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="language-menu"
            role="listbox"
            dir={menuDir}
            className={cn(
              'emis-popover absolute end-0 z-50 w-48 origin-top-end rounded-2xl py-2',
              placement === 'top' ? 'bottom-full mb-2' : 'mt-2'
            )}
            {...pop}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={currentLang === lang.code}
                onClick={() => pick(lang.code)}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium',
                  currentLang === lang.code
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <div className="flex flex-col items-start text-start">
                  <span className="font-bold">{lang.native}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-60">{lang.label}</span>
                </div>
                {currentLang === lang.code && <Check size={16} className="shrink-0 text-primary" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

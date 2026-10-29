'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLang = languages.find(l => l.code === currentLang) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200",
          variant === 'ghost' && "hover:bg-muted text-muted-foreground",
          variant === 'outline' && "border border-border hover:border-primary text-foreground",
          variant === 'filled' && "bg-muted hover:bg-muted/80 text-foreground",
          isOpen && "ring-2 ring-ring/20 border-primary"
        )}
      >
        <Globe size={18} className="text-primary" />
        <span className="hidden sm:inline">{selectedLang.native}</span>
        <span className="sm:hidden uppercase">{selectedLang.code}</span>
        <ChevronDown size={14} className={cn("transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div
          className={cn(
            'emis-popover absolute end-0 w-48 rounded-2xl py-2 z-50',
            placement === 'top' ? 'bottom-full mb-2' : 'mt-2'
          )}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onLanguageChange(lang.code);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors",
                currentLang === lang.code
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <div className="flex flex-col items-start">
                <span className="font-bold">{lang.native}</span>
                <span className="text-[10px] opacity-60 uppercase tracking-wider">{lang.label}</span>
              </div>
              {currentLang === lang.code && <Check size={16} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { Bell, Search } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: string;
}) {
  const { t, isRTL, lang, setLang } = useLanguage();
  const pathname = usePathname() || '/dashboard';

  return (
    <div
      className={cn(
        'emis-shell flex min-h-screen bg-background text-foreground',
        isRTL ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <Sidebar role={role} />

      <main className={cn('flex min-h-screen flex-1 flex-col', isRTL ? 'lg:mr-64' : 'lg:ml-64')}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 ps-14 sm:px-6 lg:ps-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="relative hidden w-full max-w-md md:block">
              <Search
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 text-muted-foreground',
                  isRTL ? 'right-3' : 'left-3'
                )}
                size={18}
              />
              <input
                type="text"
                placeholder={t.search}
                className={cn(
                  'w-full rounded-lg border border-border bg-card py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/30',
                  isRTL ? 'pe-10 ps-4' : 'ps-10 pe-4'
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector
              currentLang={lang}
              onLanguageChange={setLang}
              variant="ghost"
              placement="bottom"
            />
            <ThemeToggle />

            <button
              className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t.notifications}
            >
              <Bell size={20} />
              <span
                className={cn(
                  'absolute top-1.5 h-2 w-2 rounded-full border-2 border-card bg-destructive',
                  isRTL ? 'left-1.5' : 'right-1.5'
                )}
              />
            </button>
            <div className="mx-1 hidden h-8 w-px bg-border sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="emis-btn-primary flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold">
                DF
              </span>
              <div className={cn('leading-tight', isRTL ? 'text-left' : 'text-right')}>
                <p className="m-0 text-sm font-semibold text-foreground">{t.allAccess}</p>
                <p className="m-0 text-xs capitalize text-muted-foreground">{role || 'User'}</p>
              </div>
            </div>
          </div>
        </header>

        <div key={pathname} className="flex-1 bg-background p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

'use client';

import React, { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Sidebar from './Sidebar';
import { ArrowLeft } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import NavUserMenu, { type NavUser } from './NavUserMenu';
import { useDataRefresh } from '@/context/DataRefreshContext';
import AppBreadcrumb from './AppBreadcrumb';
import NotificationBell from './notifications/NotificationBell';
import AIAssistantWidget from './ai/AIAssistantWidget';

function MessagingNavBack() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  if (pathname !== '/messaging' || !searchParams.get('c')) return null;
  return (
    <button
      type="button"
      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Back to conversations"
      onClick={() => router.push('/messaging')}
    >
      <ArrowLeft size={20} />
    </button>
  );
}

export default function DashboardLayout({
  children,
  role,
  user,
}: {
  children: React.ReactNode;
  role?: string;
  user?: NavUser | null;
}) {
  const { isRTL, lang, setLang } = useLanguage();
  const pathname = usePathname() || '/dashboard';
  const { tick } = useDataRefresh();

  return (
    <div
      className={cn(
        'emis-shell flex h-screen h-dvh overflow-hidden bg-background text-foreground',
        isRTL ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <Sidebar role={role} />

      <main
        className={cn(
          'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 lg:py-3',
          isRTL ? 'lg:ml-3 lg:mr-[calc(16rem+1.5rem)] lg:pl-3 lg:pr-0' : 'lg:ml-[calc(16rem+1.5rem)] lg:mr-3 lg:pl-0 lg:pr-3'
        )}
      >
        <header className="z-30 mb-3 flex h-16 shrink-0 items-center justify-between rounded-2xl border border-border bg-card px-4 ps-14 shadow-card sm:px-6 lg:ps-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <Suspense fallback={null}>
              <MessagingNavBack />
            </Suspense>
            <AppBreadcrumb />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector
              currentLang={lang}
              onLanguageChange={setLang}
              variant="ghost"
              placement="bottom"
            />
            <ThemeToggle />

            <NotificationBell isRTL={isRTL} />
            <NavUserMenu
              user={{
                ...user,
                role: user?.role || role,
              }}
            />
          </div>
        </header>

        <div
          key={pathname.startsWith('/messaging') ? pathname : `${pathname}:${tick}`}
          className={cn(
            'min-h-0 min-w-0 flex-1 overflow-x-hidden overscroll-y-contain rounded-2xl bg-background',
            pathname.startsWith('/messaging') && pathname !== '/messaging/new'
              ? 'flex flex-col overflow-hidden p-0'
              : 'overflow-y-auto p-4 sm:p-6'
          )}
        >
          {children}
        </div>
      </main>
      <AIAssistantWidget />
    </div>
  );
}

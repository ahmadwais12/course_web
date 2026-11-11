'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Layers, LayoutDashboard, Menu, X } from 'lucide-react';
import BrandLoader from '@/components/ports/BrandLoader';
import BrandLogo from '@/components/BrandLogo';
import LanguageSelector from '@/components/LanguageSelector';
import ThemeToggle from '@/components/ThemeToggle';
import NavUserMenu, { type NavUser } from '@/components/NavUserMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useLanguage } from '@/context/LanguageContext';
import { APP_NAME } from '@/lib/branding';
import { cn } from '@/lib/utils';
import {
  PORTALS,
  canOpenPortal,
  portalHomeForRole,
  portalNavItemActive,
  portalPageLabel,
  portalsForNav,
  type PortalId,
} from '@/lib/portals';
import { PortalDataProvider } from '@/components/portal/PortalDataContext';

type Session = { role: string; user: NavUser };

/** Survive layout remounts so portal navigation never flashes the loader. */
let cachedSession: Session | null = null;

export default function PortalShell({
  portal,
  children,
}: {
  portal: PortalId;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() || PORTALS[portal].basePath;
  const { isRTL, lang, setLang, t } = useLanguage();
  const meta = PORTALS[portal];

  const [session, setSession] = useState<Session | null>(cachedSession);
  const [open, setOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(
    () =>
      new Set([
        ...meta.nav
          .filter((section) => section.items.some((item) => portalNavItemActive(pathname, item)))
          .map((section) => section.id),
        'portals',
      ])
  );

  useEffect(() => {
    const active = meta.nav
      .filter((section) => section.items.some((item) => portalNavItemActive(pathname, item)))
      .map((section) => section.id);
    setOpenSections((prev) =>
      active.every((id) => prev.has(id)) ? prev : new Set([...prev, ...active])
    );
  }, [pathname, meta.nav]);

  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/auth/sync', { method: 'POST' });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body?.id) throw new Error('unauthenticated');

        const role = String(body.role ?? '');
        if (!cachedSession || cachedSession.role !== role) {
          cachedSession = {
            role,
            user: {
              id: body.id,
              name: body.name,
              email: body.email,
              role,
              avatarUrl: body.avatarUrl,
            },
          };
        }
        if (cancelled) return;

        if (!canOpenPortal(role, portal)) {
          router.replace(portalHomeForRole(role));
          return;
        }
        setSession(cachedSession);
      } catch {
        cachedSession = null;
        if (!cancelled) router.replace('/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [portal, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const pageLabel = useMemo(() => portalPageLabel(portal, pathname), [portal, pathname]);
  const portalIds = useMemo(() => portalsForNav(session?.role), [session?.role]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <BrandLoader label="Opening your portal…" />
      </div>
    );
  }

  const nav = (
    <nav className="flex-1 overflow-y-auto space-y-1 p-4">
      {meta.nav.map((section) => {
        const sectionOpen = openSections.has(section.id);
        const sectionActive = section.items.some((item) => portalNavItemActive(pathname, item));
        return (
          <div key={section.id} className="pt-3 mt-2 border-t border-border space-y-1">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              aria-expanded={sectionOpen}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                sectionActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <section.icon size={20} />
              <span className="flex-1 text-start">{section.label[lang]}</span>
              <ChevronDown
                size={16}
                className={cn('transition-transform duration-200', sectionOpen && 'rotate-180')}
              />
            </button>

            <div
              inert={!sectionOpen}
              className={cn(
                'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                sectionOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="mt-1 ms-2 space-y-1 border-s border-border ps-2">
                  {section.items.map((item) => {
                    const active = portalNavItemActive(pathname, item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={!item.shared}
                        scroll={false}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                          active
                            ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            'shrink-0',
                            active ? 'text-accent-foreground' : 'text-muted-foreground'
                          )}
                        />
                        <span className="truncate">{item.label[lang]}</span>
                        {item.shared && (
                          <span className="ms-auto text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                            app
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {portalIds.length > 0 && (() => {
        const portalsOpen = openSections.has('portals');
        return (
          <div className="pt-3 mt-2 border-t border-border space-y-1">
            <button
              type="button"
              onClick={() => toggleSection('portals')}
              aria-expanded={portalsOpen}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Layers size={20} />
              <span className="flex-1 text-start">{t.portals}</span>
              <ChevronDown
                size={16}
                className={cn('transition-transform duration-200', portalsOpen && 'rotate-180')}
              />
            </button>
            <div
              inert={!portalsOpen}
              className={cn(
                'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                portalsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="mt-1 ms-2 space-y-1 border-s border-border ps-2">
                  {portalIds.map((id) => {
                    const item = PORTALS[id];
                    const active =
                      pathname === item.basePath || pathname.startsWith(`${item.basePath}/`);
                    return (
                      <Link
                        key={id}
                        href={item.basePath}
                        prefetch
                        scroll={false}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                          active
                            ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            'shrink-0',
                            active ? 'text-accent-foreground' : item.accentText
                          )}
                        />
                        <span className="truncate">{item.label[lang]}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </nav>
  );

  return (
    <PortalDataProvider portal={portal}>
      <div
        className={cn(
          'emis-shell flex h-screen h-dvh overflow-hidden bg-background text-foreground',
          isRTL ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        <aside
          className={cn(
            'fixed inset-y-3 z-50 flex w-64 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-transform duration-300 lg:translate-x-0',
            isRTL ? 'right-3' : 'left-3',
            open
              ? 'translate-x-0'
              : isRTL
                ? 'translate-x-[calc(100%+0.75rem)]'
                : '-translate-x-[calc(100%+0.75rem)]'
          )}
        >
          <div className="border-b border-border p-6">
            <div className="flex items-center gap-3">
              <BrandLogo size={40} showName={false} />
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-bold leading-tight text-foreground">{APP_NAME}</h1>
                <p className="truncate text-xs text-muted-foreground">{t.instituteManager}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {nav}

          <div className="space-y-1 border-t border-border p-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <LayoutDashboard size={20} />
              Full workspace
            </Link>
          </div>
        </aside>

        {open && (
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
          />
        )}

        <main
          className={cn(
            'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 lg:py-3',
            isRTL ? 'lg:mr-[calc(16rem+1.5rem)]' : 'lg:ml-[calc(16rem+1.5rem)]'
          )}
        >
          <header className="z-30 mb-3 flex h-16 shrink-0 items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3 shadow-card sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>
              <span
                className={cn(
                  'hidden h-8 w-8 items-center justify-center rounded-lg sm:flex',
                  meta.accentSoft
                )}
              >
                <meta.icon size={17} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {meta.name}
                </p>
                <h2 className="truncate text-sm font-bold leading-tight text-foreground">
                  {pageLabel}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <LanguageSelector
                currentLang={lang}
                onLanguageChange={setLang}
                variant="ghost"
                placement="bottom"
              />
              <ThemeToggle />
              <NotificationBell isRTL={isRTL} />
              <NavUserMenu user={{ ...session.user, role: session.user.role || session.role }} />
            </div>
          </header>

          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overscroll-y-contain overflow-y-auto rounded-2xl bg-background p-1 sm:p-2">
            {children}
          </div>
        </main>
      </div>
    </PortalDataProvider>
  );
}

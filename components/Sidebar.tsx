'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Layers, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { usePermissions } from '@/context/PermissionsContext';
import BrandLogo from '@/components/BrandLogo';
import { APP_NAME } from '@/lib/branding';
import { useAIStatus } from '@/components/ai/useAIChat';
import {
  AI_ASSISTANT_NAV_ITEM,
  DASHBOARD_NAV_ITEM,
  SIDEBAR_SECTIONS,
  isNavItemActive,
  type SidebarItem,
  type SidebarSection,
} from '@/lib/sidebar-nav';
import { PORTALS, portalsForNav } from '@/lib/portals';

function activeSectionIds(pathname: string) {
  return SIDEBAR_SECTIONS.filter((section) =>
    section.items.some((item) => isNavItemActive(pathname, item))
  ).map((section) => section.id);
}

export default function Sidebar({ role }: { role?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname() || '/dashboard';
  const { t, lang, isRTL } = useLanguage();
  const { can, abilities, loading: permsLoading } = usePermissions();

  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set([...activeSectionIds(pathname), 'portals'])
  );

  useEffect(() => {
    const active = activeSectionIds(pathname);
    setOpenSections((prev) =>
      active.every((id) => prev.has(id)) ? prev : new Set([...prev, ...active])
    );
  }, [pathname]);

  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const { status: aiStatus } = useAIStatus(lang);

  const canSee = (section: SidebarSection) =>
    !section.permission || permsLoading || abilities.length === 0 || can(section.permission);

  const canSeeItem = (item: SidebarItem) => {
    if (!item.requires) return true;
    if (item.requires === 'aiPlatformAdmin') return Boolean(aiStatus?.isPlatformAdmin);
    if (item.requires === 'aiOrgAdmin') return Boolean(aiStatus?.canManageOrganization);
    return Boolean(aiStatus?.available || aiStatus?.isPlatformAdmin);
  };

  const portalIds = portalsForNav(role);
  const showDashboard = canSeeItem(DASHBOARD_NAV_ITEM);
  const showAssistant = canSeeItem(AI_ASSISTANT_NAV_ITEM);

  const renderTopItem = (item: SidebarItem) => {
    const active = isNavItemActive(pathname, item);
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch
        scroll={false}
        onClick={() => setIsOpen(false)}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
          active
            ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <item.icon
          size={20}
          className={cn(active ? 'text-accent-foreground' : 'text-muted-foreground')}
        />
        {item.label[lang]}
      </Link>
    );
  };

  return (
    <>
      <div className={cn('lg:hidden fixed top-4 z-50', isRTL ? 'right-4' : 'left-4')}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-xl border border-border bg-card p-2 text-muted-foreground shadow-soft transition-colors hover:text-primary"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <aside
        className={cn(
          'fixed top-3 bottom-3 z-40 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-transform duration-300 ease-in-out lg:translate-x-0',
          isRTL ? 'right-3 border-s' : 'left-3 border-e',
          isOpen
            ? 'translate-x-0'
            : isRTL
              ? 'translate-x-[calc(100%+0.75rem)]'
              : '-translate-x-[calc(100%+0.75rem)]'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="border-b border-border p-6">
            <div className="flex items-center gap-3">
              <BrandLogo size={40} showName={false} />
              <div>
                <h1 className="font-bold leading-tight text-foreground">{APP_NAME}</h1>
                <p className="text-xs text-muted-foreground">{t.instituteManager}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {showDashboard && renderTopItem(DASHBOARD_NAV_ITEM)}

            {portalIds.length > 0 && (() => {
              const portalsOpen = openSections.has('portals');
              const portalsActive = portalIds.some(
                (id) =>
                  pathname === PORTALS[id].basePath ||
                  pathname.startsWith(`${PORTALS[id].basePath}/`)
              );
              return (
                <div className="pt-3 mt-2 border-t border-border space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleSection('portals')}
                    aria-expanded={portalsOpen}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                      portalsActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Layers size={20} />
                    <span className="flex-1 text-start">{t.portals}</span>
                    <ChevronDown
                      size={16}
                      className={cn(
                        'transition-transform duration-200',
                        portalsOpen && 'rotate-180'
                      )}
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
                          const meta = PORTALS[id];
                          const isActive =
                            pathname === meta.basePath ||
                            pathname.startsWith(`${meta.basePath}/`);
                          return (
                            <Link
                              key={id}
                              href={meta.basePath}
                              prefetch
                              scroll={false}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                                isActive
                                  ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <meta.icon
                                size={18}
                                className={cn(
                                  'shrink-0',
                                  isActive ? 'text-accent-foreground' : meta.accentText
                                )}
                              />
                              <span className="truncate">{meta.label[lang]}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {showAssistant && renderTopItem(AI_ASSISTANT_NAV_ITEM)}

            {SIDEBAR_SECTIONS.filter(canSee).map((section) => {
              const items = section.items.filter(canSeeItem);
              const sectionActive = items.some((item) => isNavItemActive(pathname, item));
              const sectionOpen = openSections.has(section.id);
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
                        {items.map((item) => {
                          const isActive = isNavItemActive(pathname, item);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              prefetch={sectionOpen}
                              scroll={false}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                                isActive
                                  ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <item.icon
                                size={18}
                                className={cn(
                                  'shrink-0',
                                  isActive ? 'text-accent-foreground' : 'text-muted-foreground'
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
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}

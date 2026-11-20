'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/inventory/verification', label: 'Dashboard' },
  { href: '/inventory/verification/campaigns', label: 'Campaigns' },
  { href: '/inventory/verification/sessions', label: 'Sessions' },
  { href: '/inventory/verification/discrepancies', label: 'Discrepancies' },
  { href: '/inventory/verification/reports', label: 'Reports' },
  { href: '/inventory/verification/settings', label: 'Settings' },
];

export function VerificationTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Asset verification sections"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === '/inventory/verification'
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'inline-flex h-9 shrink-0 items-center rounded-[7px] border px-3 text-sm font-semibold transition-colors',
              active
                ? 'border-[#88b6ff] bg-[#88b6ff] text-[#142033]'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full',
            safe >= 80 ? 'bg-emerald-500' : safe >= 40 ? 'bg-amber-500' : 'bg-[#88b6ff]'
          )}
          style={{ width: `${safe}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-muted-foreground">{safe}%</span>
    </div>
  );
}

export function shortDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timestamp(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

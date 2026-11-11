'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { CardSkeleton, PortButton, Skeleton } from '@/components/ports';
import { cn } from '@/lib/utils';

export function PortalLoading({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-4 p-1">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function PortalError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 text-destructive" size={20} />
        <div className="min-w-0">
          <p className="m-0 font-semibold text-destructive">Could not load portal data</p>
          <p className="m-0 mt-1 text-sm text-destructive/90">{message}</p>
          {onRetry && (
            <PortButton className="mt-3" onClick={onRetry}>
              <RefreshCw size={15} />
              Try again
            </PortButton>
          )}
        </div>
      </div>
    </div>
  );
}

export function PortalNotice({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-0.5 border-b border-border/60 py-2 last:border-0', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value || '—'}</span>
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  tone = 'bg-sky-500',
}: {
  value: number;
  className?: string;
  tone?: string;
}) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${safe}%` }} />
    </div>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function formatMonth(value: string | null | undefined) {
  if (!value) return '—';
  const [year, month] = value.split('-');
  const index = Number(month) - 1;
  return MONTHS[index] ? `${MONTHS[index]} ${year}` : value;
}

export function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  return value.slice(0, 5);
}

export function formatMoney(value: number | null | undefined, currency = 'AFN') {
  const amount = Number(value ?? 0);
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

export function initials(name: string | null | undefined) {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || '?').slice(0, 2).toUpperCase();
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Groups timetable slots by day_of_week (1 = Monday … 7 = Sunday). */
export function groupByDay<T extends { dayOfWeek: number }>(slots: T[]) {
  return DAY_NAMES.map((name, index) => ({
    day: index + 1,
    name,
    short: DAY_SHORT[index],
    slots: slots.filter((slot) => Number(slot.dayOfWeek) === index + 1),
  }));
}

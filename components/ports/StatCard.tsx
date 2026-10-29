'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  valueClassName?: string;
  className?: string;
  accent?: 'blue' | 'green' | 'gold' | 'purple';
};

const accents: Record<NonNullable<StatCardProps['accent']>, string> = {
  blue: 'from-sky-400 to-blue-600',
  green: 'from-cyan-400 to-emerald-500',
  gold: 'from-amber-300 to-orange-500',
  purple: 'from-indigo-400 to-violet-600',
};

/** Compact KMS-style metric tile — reuse on any dashboard/list page */
export default function StatCard({
  label,
  value,
  hint,
  valueClassName,
  className,
  accent = 'blue',
}: StatCardProps) {
  return (
    <article
      className={cn(
        'relative flex h-[96px] flex-col overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft',
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-3 start-0 w-1 rounded-full bg-gradient-to-b',
          accents[accent]
        )}
      />
      <small className="ps-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </small>
      <strong
        className={cn(
          'mt-0.5 ps-2 text-[27px] font-bold leading-tight tabular-nums text-foreground',
          valueClassName
        )}
      >
        {value}
      </strong>
      {hint && <span className="mt-auto ps-2 text-[10px] text-muted-foreground">{hint}</span>}
    </article>
  );
}

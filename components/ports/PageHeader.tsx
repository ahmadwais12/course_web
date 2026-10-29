'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: string;
  description?: string;
  pill?: string;
  pillTone?: 'live' | 'offline' | 'neutral';
  actions?: React.ReactNode;
  className?: string;
};

const pillTones = {
  live: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  offline: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
  neutral: 'border-border bg-muted text-muted-foreground',
};

/** Standard page title row with optional live pill + actions */
export default function PageHeader({
  title,
  description,
  pill,
  pillTone = 'live',
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'mb-5 flex flex-wrap items-start justify-between gap-4 animate-fade-up',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="m-0 text-[27px] font-bold leading-tight tracking-tight text-foreground sm:text-[30px]">
          <span className="emis-text-brand">{title}</span>
        </h1>
        {description && (
          <p className="m-0 mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {(pill || actions) && (
        <div className="flex flex-wrap items-center gap-2">
          {pill && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide',
                pillTones[pillTone]
              )}
            >
              {pill}
            </span>
          )}
          {actions}
        </div>
      )}
    </header>
  );
}

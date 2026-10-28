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
        'flex flex-wrap items-start justify-between gap-3 mb-4',
        className
      )}
    >
      <div>
        <h1 className="text-[27px] font-bold tracking-tight text-foreground leading-tight m-0 mb-1">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground m-0">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {pill && (
          <span
            className={cn(
              'text-[11px] font-bold tracking-wide rounded-full px-6 py-1.5 whitespace-nowrap',
              pillTone === 'live' && 'bg-emerald-900/40 text-emerald-300 dark:bg-[#183b32] dark:text-[#79d6b0] bg-emerald-100 text-emerald-800',
              pillTone === 'offline' && 'bg-red-100 text-red-700 dark:bg-[#49302e] dark:text-[#ffaaa4]',
              pillTone === 'neutral' && 'bg-muted text-muted-foreground'
            )}
          >
            {pill}
          </span>
        )}
        {actions}
      </div>
    </header>
  );
}

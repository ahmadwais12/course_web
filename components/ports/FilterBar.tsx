'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type FilterBarProps = {
  children: React.ReactNode;
  className?: string;
};

/** Horizontal filter row for date/select/actions */
export default function FilterBar({ children, className }: FilterBarProps) {
  return (
    <section
      className={cn(
        'grid gap-3 items-end mb-4',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(140px,1fr))_auto]',
        className
      )}
      aria-label="Filters"
    >
      {children}
    </section>
  );
}

type FilterFieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

export function FilterField({ label, children, className }: FilterFieldProps) {
  return (
    <label className={cn('text-[11px] text-muted-foreground block', className)}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type SectionPanelProps = {
  title?: string;
  description?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

/** Card panel with optional title — wrap tables, forms, lists */
export default function SectionPanel({
  title,
  description,
  headerRight,
  children,
  className,
  bodyClassName,
}: SectionPanelProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-200 hover:shadow-soft',
        className
      )}
    >
      {(title || headerRight) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && (
              <h2 className="m-0 text-[17px] font-semibold leading-snug tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="m-0 mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {headerRight}
        </div>
      )}
      <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

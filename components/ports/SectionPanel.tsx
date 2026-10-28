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
        'rounded-[11px] border border-border bg-card overflow-hidden',
        className
      )}
    >
      {(title || headerRight) && (
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-foreground m-0 leading-snug">{title}</h2>
            )}
            {description && (
              <p className="text-xs text-muted-foreground m-0 mt-0.5">{description}</p>
            )}
          </div>
          {headerRight}
        </div>
      )}
      <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

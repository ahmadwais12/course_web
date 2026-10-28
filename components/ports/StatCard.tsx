'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  valueClassName?: string;
  className?: string;
};

/** Compact KMS-style metric tile — reuse on any dashboard/list page */
export default function StatCard({
  label,
  value,
  hint,
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <article
      className={cn(
        'h-[88px] px-3.5 py-2.5 flex flex-col rounded-[11px] border border-border bg-card',
        className
      )}
    >
      <small className="text-[11px] text-muted-foreground">{label}</small>
      <strong className={cn('text-[26px] leading-tight mt-1 font-bold text-foreground', valueClassName)}>
        {value}
      </strong>
      {hint && <span className="text-[9px] text-muted-foreground mt-auto">{hint}</span>}
    </article>
  );
}

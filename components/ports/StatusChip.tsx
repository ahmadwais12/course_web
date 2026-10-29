'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'blue' | 'gold' | 'purple' | 'green' | 'gray';

const toneClass: Record<Tone, string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300',
  gold: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  purple:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300',
  green:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  gray: 'border-border bg-muted text-muted-foreground',
};

type StatusChipProps = {
  label: string;
  tone?: Tone;
  className?: string;
};

/** Small pill badge for status labels */
export default function StatusChip({ label, tone = 'blue', className }: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize',
        toneClass[tone],
        className
      )}
    >
      {label}
    </span>
  );
}

export function statusToneFromValue(status: string): Tone {
  const s = status.toLowerCase();
  if (['completed', 'active', 'success', 'paid', 'approved', 'verified', 'present'].includes(s))
    return 'green';
  if (['pending', 'new', 'late', 'draft', 'open'].includes(s)) return 'gold';
  if (
    ['failed', 'refunded', 'suspended', 'inactive', 'rejected', 'cancelled', 'absent', 'expired'].includes(
      s
    )
  )
    return 'purple';
  if (['voided', 'close', 'closed'].includes(s)) return 'gray';
  return 'blue';
}

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'blue' | 'gold' | 'purple' | 'green' | 'gray';

const toneClass: Record<Tone, string> = {
  blue: 'bg-[#e8eef5] text-[#365f96] dark:bg-[#29394b] dark:text-[#8fb8ff]',
  gold: 'bg-[#fff5d9] text-[#87620b] dark:bg-[#37352e] dark:text-[#f0ce72]',
  purple: 'bg-[#f0eafd] text-[#7045ad] dark:bg-[#302c44] dark:text-[#c7a7f5]',
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  gray: 'bg-muted text-muted-foreground',
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
        'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
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

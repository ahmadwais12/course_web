'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type SegmentOption = {
  value: string;
  label: string;
};

type SegmentedControlProps = {
  value: string;
  onChange: (value: string) => void;
  options: SegmentOption[];
  className?: string;
};

/** Shared range / tab pills used on dashboards, filters, and messaging. */
export default function SegmentedControl({
  value,
  onChange,
  options,
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        'inline-flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-full border border-border bg-muted/70 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
      role="group"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200',
            value === option.value
              ? 'bg-[#88b6ff] text-[#142033] shadow-sm'
              : 'text-muted-foreground hover:bg-card hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

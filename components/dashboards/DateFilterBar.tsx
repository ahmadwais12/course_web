'use client';

import React from 'react';
import { CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DatePreset = 'today' | '7d' | '30d' | '90d' | 'custom';

export function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function presetRange(preset: DatePreset): { from: string; to: string } {
  const to = daysAgo(0);
  if (preset === 'today') return { from: to, to };
  if (preset === '7d') return { from: daysAgo(6), to };
  if (preset === '90d') return { from: daysAgo(89), to };
  return { from: daysAgo(29), to };
}

export function detectPreset(from: string, to: string): DatePreset {
  const today = daysAgo(0);
  if (to !== today) return 'custom';
  if (from === today) return 'today';
  if (from === daysAgo(6)) return '7d';
  if (from === daysAgo(29)) return '30d';
  if (from === daysAgo(89)) return '90d';
  return 'custom';
}

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'custom', label: 'Custom' },
];

type DateFilterBarProps = {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  className?: string;
};

export default function DateFilterBar({ from, to, onChange, className }: DateFilterBarProps) {
  const preset = detectPreset(from, to);

  return (
    <div className={cn('flex flex-wrap items-end gap-2', className)}>
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/70 p-1">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id === 'custom') return;
              onChange(presetRange(item.id));
            }}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200',
              preset === item.id
                ? 'emis-btn-primary shadow-sm'
                : 'text-muted-foreground hover:bg-card hover:text-foreground'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        <CalendarRange size={14} />
        From
        <input
          type="date"
          value={from}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="h-9 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
        />
      </label>
      <label className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        To
        <input
          type="date"
          value={to}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="h-9 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
        />
      </label>
    </div>
  );
}

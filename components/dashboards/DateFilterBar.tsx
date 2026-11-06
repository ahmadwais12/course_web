'use client';

import React, { useCallback, useMemo } from 'react';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import InputField from '@/components/ports/InputField';
import SegmentedControl from '@/components/ports/SegmentedControl';

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

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
] as const;

function formatShort(iso: string) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daySpan(from: string, to: string) {
  if (!from || !to) return 0;
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

type DateFilterBarProps = {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  className?: string;
  /** Tighter stacked layout for Filter dialogs */
  variant?: 'bar' | 'panel';
};

function DateFilterBar({
  from,
  to,
  onChange,
  className,
  variant = 'bar',
}: DateFilterBarProps) {
  const preset = useMemo(() => detectPreset(from, to), [from, to]);
  const span = useMemo(() => daySpan(from, to), [from, to]);
  const summary = useMemo(
    () => `${formatShort(from)} → ${formatShort(to)} · ${span} day${span === 1 ? '' : 's'}`,
    [from, to, span]
  );

  const setPreset = useCallback(
    (value: string) => {
      onChange(presetRange(value as DatePreset));
    },
    [onChange]
  );

  const setFrom = useCallback(
    (value: string) => {
      const nextFrom = value;
      const nextTo = to && nextFrom && nextFrom > to ? nextFrom : to;
      onChange({ from: nextFrom, to: nextTo });
    },
    [onChange, to]
  );

  const setTo = useCallback(
    (value: string) => {
      const nextTo = value;
      const nextFrom = from && nextTo && nextTo < from ? nextTo : from;
      onChange({ from: nextFrom, to: nextTo });
    },
    [onChange, from]
  );

  if (variant === 'panel') {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#88b6ff]/20 text-[#142033] dark:text-sky-100">
              <CalendarDays size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Date range</p>
              <p className="truncate text-xs text-muted-foreground">{summary}</p>
            </div>
          </div>
          {preset === 'custom' ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Custom
            </span>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Quick select
          </p>
          <SegmentedControl
            value={preset === 'custom' ? '' : preset}
            onChange={setPreset}
            options={[...PRESETS]}
            className="flex w-full max-w-full justify-start sm:inline-flex sm:w-auto"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <InputField
            label="From"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            containerClassName="w-full"
          />
          <div
            className="hidden h-10 items-center justify-center text-muted-foreground sm:flex"
            aria-hidden
          >
            <ArrowRight size={16} />
          </div>
          <InputField
            label="To"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            containerClassName="w-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      <SegmentedControl
        value={preset === 'custom' ? '' : preset}
        onChange={setPreset}
        options={[...PRESETS]}
      />
      <InputField
        label="From"
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => setFrom(e.target.value)}
        containerClassName="w-[160px]"
      />
      <InputField
        label="To"
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => setTo(e.target.value)}
        containerClassName="w-[160px]"
      />
    </div>
  );
}

export default React.memo(DateFilterBar);

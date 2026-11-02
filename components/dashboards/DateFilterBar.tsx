'use client';

import React from 'react';
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
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      <SegmentedControl
        value={preset === 'custom' ? '' : preset}
        onChange={(value) => onChange(presetRange(value as DatePreset))}
        options={PRESETS}
      />
      <InputField
        label="From"
        type="date"
        value={from}
        onChange={(e) => onChange({ from: e.target.value, to })}
        containerClassName="w-[160px]"
      />
      <InputField
        label="To"
        type="date"
        value={to}
        onChange={(e) => onChange({ from, to: e.target.value })}
        containerClassName="w-[160px]"
      />
    </div>
  );
}

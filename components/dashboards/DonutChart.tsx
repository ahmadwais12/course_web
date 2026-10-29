'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type DonutSlice = {
  label: string;
  value: number;
  color: string;
};

export default function DonutChart({
  slices,
  size = 168,
  thickness = 22,
  centerLabel,
  centerValue,
  className,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: React.ReactNode;
  className?: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn('flex flex-col items-center gap-4 sm:flex-row', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-muted"
            strokeWidth={thickness}
          />
          {slices.map((slice) => {
            const length = (slice.value / total) * circumference;
            const circle = (
              <circle
                key={slice.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={thickness}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                className="transition-all duration-700"
              />
            );
            offset += length;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <strong className="text-xl font-bold tabular-nums text-foreground">{centerValue ?? total}</strong>
          {centerLabel && <span className="text-[10px] text-muted-foreground">{centerLabel}</span>}
        </div>
      </div>
      <ul className="m-0 min-w-[140px] list-none space-y-2 p-0">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
              {slice.label}
            </span>
            <b className="tabular-nums text-foreground">{slice.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

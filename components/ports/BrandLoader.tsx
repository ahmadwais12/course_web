import React from 'react';
import { cn } from '@/lib/utils';
import BanterLoader from './BanterLoader';

const sizes = {
  sm: 'banter-loader--sm',
  md: '',
  lg: 'banter-loader--lg',
} as const;

/**
 * Shared page / section loader — Banter 3×3 boxes.
 * Kept as BrandLoader so every existing import picks up the new animation.
 */
export default function BrandLoader({
  size = 'md',
  label,
  className,
}: {
  size?: keyof typeof sizes;
  label?: string;
  className?: string;
}) {
  return (
    <BanterLoader
      label={label}
      className={cn(sizes[size], className)}
    />
  );
}

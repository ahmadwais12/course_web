import React from 'react';
import { cn } from '@/lib/utils';

type BanterLoaderProps = {
  label?: string;
  className?: string;
  /** Box fill: brand (default), primary, or inverted for dark overlays */
  tone?: 'brand' | 'primary' | 'foreground';
};

/** 3×3 banter-box loader used for page and table loading states. */
export default function BanterLoader({
  label,
  className,
  tone = 'brand',
}: BanterLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn('banter-loader-wrap', className)}
    >
      <div
        className={cn(
          'banter-loader',
          tone === 'primary' && 'banter-loader--primary',
          tone === 'foreground' && 'banter-loader--foreground'
        )}
        aria-hidden
      >
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="banter-loader__box" />
        ))}
      </div>
      {label ? (
        <p className="banter-loader__label">{label}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}

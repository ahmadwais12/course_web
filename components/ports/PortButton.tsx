'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** First-commit KMS primary: soft blue #88b6ff on deep navy text */
const variants: Record<Variant, string> = {
  primary: 'bg-[#88b6ff] text-[#142033] hover:opacity-90 shadow-sm',
  secondary:
    'border border-border bg-card text-foreground shadow-sm hover:bg-muted active:translate-y-px',
  ghost: 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
  danger: 'bg-destructive text-destructive-foreground hover:opacity-90',
};

type PortButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

/** Shared action button (first-commit brand colors) */
export default function PortButton({
  variant = 'secondary',
  className,
  children,
  type = 'button',
  ...props
}: PortButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[7px] px-4 text-sm font-semibold transition-opacity',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

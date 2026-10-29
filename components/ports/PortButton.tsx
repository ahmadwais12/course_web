'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'emis-btn-primary shadow-sm hover:shadow-md active:translate-y-px',
  secondary:
    'border border-border bg-card text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/30 active:translate-y-px',
  ghost: 'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  danger: 'bg-destructive text-destructive-foreground shadow-sm hover:opacity-90 active:translate-y-px',
};

type PortButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

/** Shared action button */
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
        'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-all duration-200',
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

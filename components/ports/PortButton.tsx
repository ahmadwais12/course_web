'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'bg-[#88b6ff] text-[#142033] hover:opacity-90',
  secondary: 'bg-muted text-foreground hover:bg-muted/80 border border-border',
  ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
  danger: 'bg-destructive text-destructive-foreground hover:opacity-90',
};

type PortButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

/** Shared action button (KMS filter/action height) */
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
        'h-10 px-4 rounded-[7px] text-sm font-semibold whitespace-nowrap transition-opacity disabled:opacity-50',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

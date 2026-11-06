'use client';

import React, { useState } from 'react';
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

type Ripple = { id: number; x: number; y: number; size: number };

let rippleId = 0;

/** Shared action button (first-commit brand colors) */
export default function PortButton({
  variant = 'secondary',
  className,
  children,
  type = 'button',
  onPointerDown,
  ...props
}: PortButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    onPointerDown?.(event);
    if (props.disabled || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = {
      id: ++rippleId,
      x: event.clientX - rect.left - size / 2,
      y: event.clientY - rect.top - size / 2,
      size,
    };
    setRipples((current) => [...current, ripple]);
  };

  return (
    <button
      type={type}
      className={cn(
        'relative isolate inline-flex h-10 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-[7px] px-4 text-sm font-semibold',
        'transition-[background-color,color,border-color,box-shadow,opacity] duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        className
      )}
      onPointerDown={handlePointerDown}
      {...props}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          aria-hidden
          className="ports-ink"
          style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }}
          onAnimationEnd={() => setRipples((current) => current.filter((item) => item.id !== ripple.id))}
        />
      ))}
    </button>
  );
}

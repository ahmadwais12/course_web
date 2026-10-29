'use client';

import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  message?: string;
  className?: string;
  children?: React.ReactNode;
};

/** Centered empty / no-data placeholder */
export default function EmptyState({
  message = 'No data found.',
  className,
  children,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-10 text-center', className)}>
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
        <Inbox size={20} />
      </span>
      <p className="m-0 text-sm text-muted-foreground">{message}</p>
      {children}
    </div>
  );
}

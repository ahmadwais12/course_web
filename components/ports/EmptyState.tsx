'use client';

import React from 'react';
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
    <div className={cn('text-center text-muted-foreground py-8 px-4', className)}>
      <p className="text-sm m-0">{message}</p>
      {children}
    </div>
  );
}

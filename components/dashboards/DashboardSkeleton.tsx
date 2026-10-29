'use client';

import React from 'react';
import Skeleton from '@/components/ports/Skeleton';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mx-auto h-40 w-40 rounded-full" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  );
}

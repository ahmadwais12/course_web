'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { CardSkeleton } from './Skeleton';

type LazySectionProps = {
  children: React.ReactNode;
  className?: string;
  /** Height reserved before load */
  minHeight?: number;
  rootMargin?: string;
};

/** Lazy-mount children when scrolled into view */
export default function LazySection({
  children,
  className,
  minHeight = 120,
  rootMargin = '120px',
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={cn(className)} style={{ minHeight: visible ? undefined : minHeight }}>
      {visible ? children : <CardSkeleton />}
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CardSkeleton } from './Skeleton';

type LazySectionProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Height reserved before load */
  minHeight?: number;
  rootMargin?: string;
};

/** Lazy-mount children when scrolled into view */
export default function LazySection({
  children,
  className,
  id,
  minHeight = 120,
  rootMargin = '120px',
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();

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
    <div ref={ref} id={id} className={cn(className)} style={{ minHeight: visible ? undefined : minHeight }}>
      {visible ? (
        reduce ? (
          children
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        )
      ) : (
        <CardSkeleton />
      )}
    </div>
  );
}

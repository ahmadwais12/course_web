'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

const offset: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
  none: { x: 0, y: 0 },
};

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  direction?: Direction;
  delay?: number;
  duration?: number;
  /** Fade back out when the element leaves the viewport. */
  once?: boolean;
  amount?: number;
};

/** Fades content in on scroll and out again when it leaves the viewport. */
export default function Reveal({
  children,
  className,
  direction = 'up',
  delay = 0,
  duration = 0.5,
  once = false,
  amount = 0.2,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const { x, y } = offset[direction];

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

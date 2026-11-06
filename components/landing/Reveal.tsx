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
  duration = 0.7,
  once = false,
  amount = 0.18,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const { x, y } = offset[direction];

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }}
      viewport={{ once, amount, margin: '0px 0px -8% 0px' }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

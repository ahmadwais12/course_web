'use client';

import { useReducedMotion, type MotionProps } from 'framer-motion';

/** PrimeVue Aura overlay curve (dialogs, dropdown menus). */
export const PORTS_EASE: [number, number, number, number] = [0.19, 1, 0.22, 1];

const maskMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: 'linear' },
} satisfies MotionProps;

const popMotion = {
  initial: { opacity: 0, scale: 0.93 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.93 },
  transition: { duration: 0.3, ease: PORTS_EASE },
} satisfies MotionProps;

const instant = { duration: 0 };

/** Backdrop fade + scale-in pop shared by every Ports overlay. */
export function usePortsMotion() {
  const reduce = useReducedMotion();
  return reduce
    ? { mask: { ...maskMotion, transition: instant }, pop: { ...popMotion, transition: instant } }
    : { mask: maskMotion, pop: popMotion };
}

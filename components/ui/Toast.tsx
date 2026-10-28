'use client';

import React, { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  description?: string;
  duration: number;
}

export interface ToastOptions {
  description?: string;
  /** Auto-dismiss delay in ms. Pass 0 to keep it until dismissed manually. */
  duration?: number;
}

const DEFAULT_DURATION = 4000;
const MAX_VISIBLE = 4;

let toasts: ToastItem[] = [];
const EMPTY: ToastItem[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return toasts;
}

function getServerSnapshot() {
  return EMPTY;
}

export function dismissToast(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

function pushToast(variant: ToastVariant, message: string, options?: ToastOptions) {
  if (!message) return '';
  const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const duration = options?.duration ?? DEFAULT_DURATION;
  toasts = [
    { id, variant, message, description: options?.description, duration },
    ...toasts,
  ].slice(0, MAX_VISIBLE);
  emit();
  if (duration > 0) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), duration)
    );
  }
  return id;
}

/**
 * Imperative snackbar API. Call from any client-side handler:
 *   toast.success('Saved successfully');
 *   toast.error('Could not save', { description: 'Please try again.' });
 */
export const toast = {
  success: (message: string, options?: ToastOptions) => pushToast('success', message, options),
  error: (message: string, options?: ToastOptions) => pushToast('error', message, options),
  info: (message: string, options?: ToastOptions) => pushToast('info', message, options),
  dismiss: dismissToast,
};

/** Hook form, for components that prefer it. */
export function useToast() {
  return { toast, dismiss: dismissToast };
}

const VARIANTS: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; accent: string; bar: string }
> = {
  success: {
    icon: CheckCircle2,
    accent: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
  error: {
    icon: AlertTriangle,
    accent: 'text-destructive',
    bar: 'bg-destructive',
  },
  info: {
    icon: Info,
    accent: 'text-muted-foreground',
    bar: 'bg-foreground/60',
  },
};

function ToastCard({ item }: { item: ToastItem }) {
  const { icon: Icon, accent, bar } = VARIANTS[item.variant];
  const isError = item.variant === 'error';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-border bg-card py-3 ps-4 pe-2 text-card-foreground shadow-xl"
    >
      <span className={cn('absolute inset-y-0 start-0 w-1', bar)} aria-hidden />
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', accent)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold leading-snug">{item.message}</p>
        {item.description ? (
          <p className="mt-0.5 break-words text-xs text-muted-foreground">
            {item.description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(item.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

/** Global snackbar viewport — mount once in the root layout. */
export default function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed top-4 end-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <ToastCard key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}

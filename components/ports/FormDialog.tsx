'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import PortButton from './PortButton';
import { usePortsMotion } from './motion';

type FormDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
};

const widths = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

/** Full-page light dim used behind every Ports dialog. */
export const dialogOverlayClass =
  'fixed inset-0 z-[100] flex items-center justify-center bg-[#142033]/25 p-4 dark:bg-[#142033]/45';

/** Layer + separate backdrop so the dim can fade without fading the dialog. */
export const dialogLayerClass = 'fixed inset-0 z-[100] flex items-center justify-center p-4';
export const dialogBackdropClass = 'absolute inset-0 bg-[#142033]/25 dark:bg-[#142033]/45';

/** Shared modal used for add/edit forms on every list page. */
export default function FormDialog({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidth = 'lg',
  className,
}: FormDialogProps) {
  const [mounted, setMounted] = useState(false);
  const motionProps = usePortsMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Callers usually clear their data together with `open`; keep the last content visible while the exit animation runs.
  const lastContent = useRef({ title, children, footer });
  if (open) lastContent.current = { title, children, footer };
  const view = lastContent.current;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="form-dialog" className={dialogLayerClass} onClick={onClose}>
          <motion.div aria-hidden className={dialogBackdropClass} {...motionProps.mask} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={view.title}
            className={cn(
              'emis-dialog relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl',
              widths[maxWidth],
              className
            )}
            onClick={(e) => e.stopPropagation()}
            {...motionProps.pop}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-xl font-semibold">{view.title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4">{view.children}</div>
            {view.footer ? (
              <div className="flex justify-end gap-2 border-t border-border bg-muted/40 px-6 py-4">
                {view.footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

type FormDialogFooterProps = {
  onCancel: () => void;
  submitLabel: string;
  submitting?: boolean;
  disabled?: boolean;
  formId?: string;
};

export function FormDialogFooter({
  onCancel,
  submitLabel,
  submitting,
  disabled,
  formId,
}: FormDialogFooterProps) {
  return (
    <>
      <PortButton variant="ghost" type="button" onClick={onCancel}>
        Cancel
      </PortButton>
      <PortButton variant="primary" type="submit" form={formId} disabled={disabled || submitting}>
        {submitting ? 'Saving…' : submitLabel}
      </PortButton>
    </>
  );
}

export function DetailDialog({
  open,
  title,
  onClose,
  rows,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  rows: { label: string; value: React.ReactNode }[];
}) {
  return (
    <FormDialog
      open={open}
      title={title}
      onClose={onClose}
      maxWidth="xl"
      footer={
        <PortButton variant="ghost" type="button" onClick={onClose}>
          Close
        </PortButton>
      }
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0 rounded-xl border border-border px-3 py-2">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="mt-0.5 break-words text-sm font-medium text-foreground">{row.value || '—'}</dd>
          </div>
        ))}
      </dl>
    </FormDialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  submitting = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  submitting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <FormDialog
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <PortButton variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </PortButton>
          <PortButton variant="danger" type="button" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Working…' : confirmLabel}
          </PortButton>
        </>
      }
    >
      <p className="text-sm text-foreground">{message}</p>
    </FormDialog>
  );
}

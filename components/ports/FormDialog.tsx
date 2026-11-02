'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import PortButton from './PortButton';

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

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={dialogOverlayClass}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cn(
          'emis-dialog flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl',
          widths[maxWidth],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-border bg-muted/40 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
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

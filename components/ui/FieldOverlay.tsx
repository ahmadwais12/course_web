'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePortsMotion } from '@/components/ports/motion';

type FieldOverlayProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  overlayRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  children: React.ReactNode;
};

/** Portals a field menu above dialogs so overflow on the modal cannot clip it. */
export default function FieldOverlay({
  open,
  anchorRef,
  overlayRef,
  className,
  children,
}: FieldOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const { pop } = usePortsMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function place() {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(140, Math.min(280, openUp ? spaceAbove : spaceBelow));
      setStyle(
        openUp
          ? {
              left: Math.max(8, rect.left),
              width: rect.width,
              bottom: window.innerHeight - rect.top + gap,
              maxHeight,
            }
          : {
              left: Math.max(8, rect.left),
              width: rect.width,
              top: rect.bottom + gap,
              maxHeight,
            }
      );
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="field-overlay"
          ref={overlayRef}
          className={cn(
            'fixed z-[220] flex flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg',
            className
          )}
          style={{ ...style, transformOrigin: style.bottom !== undefined ? 'bottom' : 'top' }}
          {...pop}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

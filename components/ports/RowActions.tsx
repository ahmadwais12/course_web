'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RowActionItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
};

type RowActionsProps = {
  items?: RowActionItem[];
  onEdit?: () => void;
  onDelete?: () => void;
  /** Show icons inline up to this count; more than this collapses into one overflow icon. */
  maxInline?: number;
};

const MAX_INLINE = 4;

function iconButtonClass(danger?: boolean, active?: boolean) {
  return cn(
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] border border-border bg-card text-foreground shadow-sm',
    'transition-colors hover:bg-muted',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    danger && 'text-destructive hover:bg-destructive/10',
    active && 'border-primary ring-1 ring-primary'
  );
}

function ActionIconButton({
  item,
  onDone,
}: {
  item: RowActionItem;
  onDone?: () => void;
}) {
  return (
    <button
      type="button"
      title={item.label}
      aria-label={item.label}
      disabled={item.disabled}
      className={iconButtonClass(item.danger)}
      onClick={() => {
        item.onClick();
        onDone?.();
      }}
    >
      {item.icon}
    </button>
  );
}

/** Shared table-row actions: icons only. More than 4 collapse into one overflow icon. */
export default function RowActions({
  items,
  onEdit,
  onDelete,
  maxInline = MAX_INLINE,
}: RowActionsProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, ready: false });

  const allItems = useMemo(() => {
    const next: RowActionItem[] = [...(items ?? [])];
    if (onEdit && !next.some((item) => item.key === 'edit')) {
      next.push({
        key: 'edit',
        label: 'Edit',
        icon: <Pencil size={16} />,
        onClick: onEdit,
      });
    }
    if (onDelete && !next.some((item) => item.key === 'delete')) {
      next.push({
        key: 'delete',
        label: 'Delete',
        icon: <Trash2 size={16} />,
        onClick: onDelete,
        danger: true,
      });
    }
    return next;
  }, [items, onEdit, onDelete]);

  const collapse = allItems.length > maxInline;

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos({ top: 0, left: 0, ready: false });
      return;
    }

    const place = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const rect = trigger.getBoundingClientRect();
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;
      const gap = 4;
      const pad = 8;
      const spaceBelow = window.innerHeight - rect.bottom - pad;
      const spaceAbove = rect.top - pad;
      const openUp = menuHeight > spaceBelow && spaceAbove > spaceBelow;

      let top = openUp ? rect.top - menuHeight - gap : rect.bottom + gap;
      top = Math.min(Math.max(top, pad), Math.max(pad, window.innerHeight - menuHeight - pad));

      let left = rect.right - menuWidth;
      left = Math.min(Math.max(left, pad), Math.max(pad, window.innerWidth - menuWidth - pad));

      setMenuPos({ top, left, ready: true });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, allItems.length]);

  useEffect(() => {
    if (!open) return;

    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (allItems.length === 0) return null;

  if (!collapse) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        {allItems.map((item) => (
          <ActionIconButton key={item.key} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end">
      <button
        ref={triggerRef}
        type="button"
        title="Actions"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className={iconButtonClass(false, open)}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreVertical size={16} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className={cn(
              'fixed z-[200] max-h-[min(22rem,calc(100vh-16px))] min-w-[13rem] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg',
              !menuPos.ready && 'invisible'
            )}
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {allItems.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium',
                  'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:pointer-events-none disabled:opacity-50',
                  item.danger && 'text-destructive hover:bg-destructive/10'
                )}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] border border-border bg-card">
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

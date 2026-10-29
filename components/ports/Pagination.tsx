'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

export const PER_PAGE_OPTIONS = [5, 10, 20, 50, 100] as const;

type PaginationProps = {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
};

const navButton =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-card px-2 text-sm text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-45';

/** KMS-style “Rows per fetch” + page buttons */
export default function Pagination({
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
  disabled = false,
  className,
  label = 'Rows per fetch',
}: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / perPage) || 1);
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const pages = useMemo(() => {
    const list: (number | '…')[] = [];
    if (lastPage <= 7) {
      for (let i = 1; i <= lastPage; i++) list.push(i);
      return list;
    }
    list.push(1);
    const start = Math.max(2, page - 1);
    const end = Math.min(lastPage - 1, page + 1);
    if (start > 2) list.push('…');
    for (let i = start; i <= end; i++) list.push(i);
    if (end < lastPage - 1) list.push('…');
    list.push(lastPage);
    return list;
  }, [page, lastPage]);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3',
        className
      )}
    >
      <small className="text-[11px] text-muted-foreground">
        Showing {from}–{to} of {total}
      </small>

      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {label}
          <select
            value={perPage}
            disabled={disabled}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="h-8 cursor-pointer rounded-lg border border-border bg-card px-2 text-sm text-foreground shadow-sm disabled:opacity-50"
          >
            {PER_PAGE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={navButton}
          >
            ‹ Prev
          </button>
          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`e-${i}`} className="px-1 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                disabled={disabled}
                onClick={() => onPageChange(p)}
                className={cn(
                  'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm transition-colors',
                  p === page
                    ? 'emis-btn-primary border-transparent font-bold shadow-sm'
                    : 'border-border bg-card text-foreground shadow-sm hover:bg-muted'
                )}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            disabled={disabled || page >= lastPage}
            onClick={() => onPageChange(page + 1)}
            className={navButton}
          >
            Next ›
          </button>
        </div>
      </div>
    </div>
  );
}

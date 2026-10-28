'use client';

import React, { useEffect, useState } from 'react';
import { Filter, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import PortButton from './PortButton';
import SearchBar from './SearchBar';

type FilterSectionProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Filter fields shown inside the Filters dialog */
  children?: React.ReactNode;
  onReset?: () => void;
  actions?: React.ReactNode;
  className?: string;
  title?: string;
  /** Number of active filters (shows badge on button) */
  activeCount?: number;
};

/**
 * Search bar always visible + Filters button that opens a dialog.
 */
export default function FilterSection({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  children,
  onReset,
  actions,
  className,
  title = 'Filters',
  activeCount = 0,
}: FilterSectionProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const hasFilters = React.Children.count(children) > 0;

  return (
    <>
      <section
        className={cn(
          'rounded-[11px] border border-border bg-card p-3 sm:p-4',
          className
        )}
        aria-label="Search and filters"
      >
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {onSearchChange && (
            <SearchBar
              value={search ?? ''}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              className="w-full sm:w-52 md:w-60"
            />
          )}

          <div className="flex items-center gap-2 shrink-0">
            {hasFilters && (
              <PortButton
                variant="secondary"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 relative"
              >
                <Filter size={16} />
                Filters
                {activeCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                    {activeCount}
                  </span>
                )}
              </PortButton>
            )}
            {actions}
          </div>
        </div>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="filters-dialog-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="emis-dialog bg-popover text-popover-foreground w-full max-w-lg rounded-xl border border-border shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 id="filters-dialog-title" className="text-lg font-semibold flex items-center gap-2">
                <Filter size={18} />
                {title}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {children}
            </div>

            <div className="flex flex-wrap justify-end gap-2 px-5 py-4 border-t border-border bg-muted/30">
              {onReset && (
                <PortButton
                  variant="secondary"
                  onClick={() => {
                    onReset();
                  }}
                  className="inline-flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  Reset
                </PortButton>
              )}
              <PortButton variant="primary" onClick={() => setOpen(false)}>
                Apply
              </PortButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

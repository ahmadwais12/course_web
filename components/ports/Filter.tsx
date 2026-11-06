'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Filter as FilterIcon, RotateCcw, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import PortButton from './PortButton';
import SearchBar from './SearchBar';
import Dropdown, { type SelectOption } from './Dropdown';
import { dialogBackdropClass, dialogLayerClass } from './FormDialog';
import { usePortsMotion } from './motion';
import DateFilterBar from '@/components/dashboards/DateFilterBar';

/** One dropdown filter field rendered inside the Filter dialog. */
export type FilterField = {
  key: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
};

export type FilterProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Dropdown filters shown inside the dialog */
  filters?: FilterField[];
  dateFrom?: string;
  dateTo?: string;
  onDateRangeChange?: (next: { from: string; to: string }) => void;
  onReset?: () => void;
  title?: string;
  description?: string;
  className?: string;
  actions?: React.ReactNode;
  /**
   * Optional custom fields inside the dialog (rendered after date + dropdowns).
   * Prefer `filters` + date props for standard pages.
   */
  children?: React.ReactNode;
};

function snapshotFilters(filters: FilterField[]) {
  const draft: Record<string, string> = {};
  for (const f of filters) draft[f.key] = f.value;
  return draft;
}

/**
 * Reusable Ports Filter — search stays visible; one Filters button opens a dialog
 * with date range + all dropdown filters. Edits stay local until Apply (better performance).
 */
export default function Filter({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  dateFrom,
  dateTo,
  onDateRangeChange,
  onReset,
  title = 'Filters',
  description = 'Choose options below, then apply to update results.',
  className,
  actions,
  children,
}: FilterProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const motionProps = usePortsMotion();
  const [draftFrom, setDraftFrom] = useState(dateFrom ?? '');
  const [draftTo, setDraftTo] = useState(dateTo ?? '');
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>(() =>
    snapshotFilters(filters)
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasDate = Boolean(onDateRangeChange && dateFrom != null && dateTo != null);
  const activeFilters = filters.filter((f) => Boolean(f.value));
  const activeCount = activeFilters.length;
  const hasDialogContent =
    hasDate || filters.length > 0 || React.Children.toArray(children).some(Boolean);

  const openDialog = useCallback(() => {
    setDraftFrom(dateFrom ?? '');
    setDraftTo(dateTo ?? '');
    setDraftFilters(snapshotFilters(filters));
    setOpen(true);
  }, [dateFrom, dateTo, filters]);

  const closeDialog = useCallback(() => setOpen(false), []);

  const applyDraft = useCallback(() => {
    if (hasDate && onDateRangeChange) {
      const next = { from: draftFrom, to: draftTo };
      if (next.from !== dateFrom || next.to !== dateTo) {
        onDateRangeChange(next);
      }
    }
    for (const f of filters) {
      const nextVal = draftFilters[f.key] ?? '';
      if (nextVal !== f.value) f.onChange(nextVal);
    }
    setOpen(false);
  }, [
    hasDate,
    onDateRangeChange,
    draftFrom,
    draftTo,
    dateFrom,
    dateTo,
    filters,
    draftFilters,
  ]);

  const resetDraft = useCallback(() => {
    const cleared: Record<string, string> = {};
    for (const f of filters) cleared[f.key] = '';
    setDraftFilters(cleared);
    if (hasDate) {
      // Keep a sensible default window in the draft; parent onReset owns real defaults.
      setDraftFrom(dateFrom ?? '');
      setDraftTo(dateTo ?? '');
    }
    onReset?.();
    setOpen(false);
  }, [filters, hasDate, dateFrom, dateTo, onReset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDialog();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, closeDialog]);

  const onDraftDateChange = useCallback((next: { from: string; to: string }) => {
    setDraftFrom(next.from);
    setDraftTo(next.to);
  }, []);

  const chips = useMemo(() => {
    return activeFilters.map((f) => {
      const opt = f.options.find((o) => o.value === f.value);
      return {
        key: f.key,
        label: `${f.label}: ${opt?.label ?? f.value}`,
        onClear: () => f.onChange(''),
      };
    });
  }, [activeFilters]);

  const draftActiveCount = useMemo(() => {
    return Object.values(draftFilters).filter(Boolean).length;
  }, [draftFilters]);

  return (
    <>
      <section
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-card sm:p-4',
          className
        )}
        aria-label="Search and filters"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#88b6ff]/70 to-transparent"
        />

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          {onSearchChange ? (
            <SearchBar
              value={search}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              className="w-full min-w-0 flex-1"
            />
          ) : (
            <div className="min-w-0 flex-1" />
          )}

          <div className="flex shrink-0 items-center justify-end gap-2 sm:ms-auto">
            {actions}
            {hasDialogContent ? (
              <PortButton
                variant={activeCount > 0 ? 'primary' : 'secondary'}
                onClick={openDialog}
                className={cn(
                  'relative inline-flex items-center gap-2 px-4',
                  activeCount > 0 && 'shadow-md ring-2 ring-[#88b6ff]/35'
                )}
                aria-haspopup="dialog"
                aria-expanded={open}
              >
                <FilterIcon size={16} />
                Filters
                {activeCount > 0 ? (
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#142033] px-1.5 text-[11px] font-bold text-white dark:bg-white dark:text-[#142033]">
                    {activeCount}
                  </span>
                ) : (
                  <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
                    All options
                  </span>
                )}
              </PortButton>
            ) : null}
          </div>
        </div>

        {chips.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onClear}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#88b6ff]/40 bg-[#88b6ff]/12 px-2.5 py-1 text-[11px] font-semibold text-[#142033] transition-colors hover:bg-[#88b6ff]/22 dark:text-sky-100"
                title="Clear filter"
              >
                {chip.label}
                <X size={12} className="opacity-70" />
              </button>
            ))}
            {onReset ? (
              <PortButton variant="ghost" className="h-7 px-2 text-xs" onClick={onReset}>
                Clear all
              </PortButton>
            ) : null}
          </div>
        ) : null}
      </section>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && hasDialogContent ? (
              <div key="filter-dialog" className={dialogLayerClass} onClick={closeDialog}>
                <motion.div
                  aria-hidden
                  className={cn(dialogBackdropClass, 'backdrop-blur-[2px]')}
                  {...motionProps.mask}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="filter-dialog-title"
                  className="emis-dialog relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-float"
                  onClick={(e) => e.stopPropagation()}
                  {...motionProps.pop}
                >
                  <div className="relative overflow-hidden border-b border-border px-5 py-5 sm:px-6">
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-br from-[#88b6ff]/25 via-transparent to-sky-400/10"
                    />
                    <div
                      aria-hidden
                      className="absolute -end-8 -top-10 h-28 w-28 rounded-full bg-[#88b6ff]/20 blur-2xl"
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#88b6ff]/40 bg-[#88b6ff]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#142033] dark:text-sky-100">
                          <Sparkles size={12} />
                          Refine results
                        </div>
                        <h3
                          id="filter-dialog-title"
                          className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground"
                        >
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#88b6ff] text-[#142033] shadow-sm">
                            <FilterIcon size={18} />
                          </span>
                          {title}
                        </h3>
                        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                          {description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeDialog}
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Close filters"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[min(62vh,520px)] space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                    {hasDate ? (
                      <div className="rounded-2xl border border-[#88b6ff]/25 bg-gradient-to-br from-[#88b6ff]/10 via-card to-card p-3 shadow-sm sm:p-4">
                        <DateFilterBar
                          variant="panel"
                          from={draftFrom}
                          to={draftTo}
                          onChange={onDraftDateChange}
                        />
                      </div>
                    ) : null}

                    {filters.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          Options
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {filters.map((f) => (
                            <Dropdown
                              key={f.key}
                              label={f.label}
                              value={draftFilters[f.key] ?? ''}
                              onChange={(value) =>
                                setDraftFilters((prev) => ({ ...prev, [f.key]: value }))
                              }
                              options={f.options}
                              placeholder={`All ${f.label.toLowerCase()}`}
                              clearable
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {children ? <div className="space-y-4">{children}</div> : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-gradient-to-r from-muted/80 to-muted/40 px-5 py-4 sm:px-6">
                    <p className="text-xs text-muted-foreground">
                      {draftActiveCount > 0
                        ? `${draftActiveCount} option${draftActiveCount === 1 ? '' : 's'} selected · Apply to update`
                        : 'Adjust filters, then apply'}
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                      {onReset ? (
                        <PortButton
                          variant="secondary"
                          onClick={resetDraft}
                          className="inline-flex items-center gap-1.5"
                        >
                          <RotateCcw size={14} />
                          Reset
                        </PortButton>
                      ) : null}
                      <PortButton variant="primary" onClick={applyDraft}>
                        Apply filters
                      </PortButton>
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : null}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

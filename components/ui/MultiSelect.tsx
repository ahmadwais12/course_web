'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectOption } from './SearchableSelect';

type MultiSelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  filterPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  filter?: boolean;
  clearable?: boolean;
  maxSelectedLabels?: number;
  invalid?: boolean;
  className?: string;
};

/** KMS-style PrimeVue MultiSelect (filter + chips) */
export default function MultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  filterPlaceholder = 'Search',
  disabled = false,
  loading = false,
  filter = true,
  clearable = true,
  maxSelectedLabels = 5,
  invalid = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOptions = useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (open && filter) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, filter]);

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  const visibleChips = selectedOptions.slice(0, maxSelectedLabels);
  const extraCount = selectedOptions.length - visibleChips.length;

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'emis-multiselect flex w-full min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-colors',
          'bg-muted text-foreground border-border',
          'hover:border-primary/60',
          open && 'border-primary ring-1 ring-primary',
          invalid && 'border-destructive ring-1 ring-destructive',
          (disabled || loading) && 'opacity-60 cursor-not-allowed'
        )}
      >
        <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
          {selectedOptions.length === 0 && (
            <span className="text-muted-foreground py-0.5">{placeholder}</span>
          )}
          {visibleChips.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-accent text-accent-foreground border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              {opt.label}
              <span
                role="button"
                tabIndex={-1}
                className="hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(opt.value);
                }}
              >
                <X size={12} />
              </span>
            </span>
          ))}
          {extraCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted border border-border text-muted-foreground">
              +{extraCount} more
            </span>
          )}
        </div>
        {clearable && value.length > 0 && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            className="p-0.5 rounded hover:bg-background text-muted-foreground shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
          >
            <X size={14} />
          </span>
        )}
        {loading ? (
          <Loader2 size={16} className="animate-spin text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown
            size={16}
            className={cn(
              'text-muted-foreground transition-transform shrink-0',
              open && 'rotate-180'
            )}
          />
        )}
      </button>

      {open && (
        <div className="emis-multiselect-overlay absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden">
          {filter && (
            <div className="p-2 border-b border-border">
              <div className="flex items-center gap-2 rounded-md bg-muted border border-border px-2.5 py-1.5">
                <Search size={14} className="text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={filterPlaceholder}
                  className="w-full bg-transparent text-sm outline-none border-0 p-0 focus:ring-0"
                />
              </div>
            </div>
          )}
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No results</li>
            )}
            {filtered.map((opt) => {
              const checked = value.includes(opt.value);
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    className={cn(
                      'emis-multiselect-item flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                      checked
                        ? 'bg-primary/10 text-foreground'
                        : 'text-foreground hover:bg-muted'
                    )}
                    onClick={() => toggle(opt.value)}
                  >
                    <span
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                        checked
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border'
                      )}
                    >
                      {checked && <Check size={12} />}
                    </span>
                    <span className="flex-1 truncate">{opt.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {value.length > 0 && (
            <div className="px-3 py-2 border-t border-border text-xs text-green-600 dark:text-green-400">
              {value.length} permission{value.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}

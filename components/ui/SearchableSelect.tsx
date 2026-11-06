'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fieldInvalidClass,
  fieldOverlaySearchClass,
  fieldTriggerClass,
  fieldTriggerOpenClass,
} from '@/components/ports/fieldStyles';
import FieldOverlay from '@/components/ui/FieldOverlay';

export type SelectOption = {
  label: string;
  value: string;
};

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  filterPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  filter?: boolean;
  clearable?: boolean;
  invalid?: boolean;
  className?: string;
};

/** KMS-style PrimeVue Select/Dropdown (filterable) */
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  filterPlaceholder = 'Search',
  disabled = false,
  loading = false,
  filter = true,
  clearable = false,
  invalid = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || overlayRef.current?.contains(target)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (open && filter) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, filter]);

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          fieldTriggerClass,
          open && fieldTriggerOpenClass,
          invalid && fieldInvalidClass
        )}
      >
        <span
          className={cn(
            'flex-1 truncate',
            !selected && 'text-muted-foreground'
          )}
        >
          {loading ? 'Loading…' : selected?.label || placeholder}
        </span>
        {clearable && value && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            className="p-0.5 rounded hover:bg-background text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          >
            <X size={14} />
          </span>
        )}
        {loading ? (
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        ) : (
          <ChevronDown
            size={16}
            className={cn(
              'text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
          />
        )}
      </button>

      <FieldOverlay open={open} anchorRef={rootRef} overlayRef={overlayRef} className="emis-select-overlay">
        {filter && (
          <div className="border-b border-border p-2">
            <div className={fieldOverlaySearchClass}>
              <Search size={14} className="shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={filterPlaceholder}
                className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
              />
            </div>
          </div>
        )}
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">No results</li>
          )}
          {filtered.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  className={cn(
                    'emis-select-option flex w-full items-center gap-2 px-3 py-2 text-sm text-left',
                    isSelected
                      ? 'emis-btn-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {isSelected && <Check size={14} />}
                </button>
              </li>
            );
          })}
        </ul>
      </FieldOverlay>
    </div>
  );
}

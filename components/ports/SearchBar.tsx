'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  onSubmit?: (value: string) => void;
};

/** Global search input — use above tables / lists */
export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  onSubmit,
}: SearchBarProps) {
  return (
    <form
      className={cn('relative w-full', className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
    >
      <Search
        size={16}
        className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-10 w-full rounded-xl border border-border bg-card ps-10 pe-9 text-sm text-foreground shadow-sm',
          'placeholder:text-muted-foreground outline-none transition-all duration-200',
          'hover:border-primary/35 dark:hover:border-primary/40',
          'focus:border-primary focus:ring-4 focus:ring-primary/20'
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => onChange('')}
        >
          <X size={14} />
        </button>
      )}
    </form>
  );
}

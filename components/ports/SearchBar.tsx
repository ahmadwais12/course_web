'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fieldControlClass } from './fieldStyles';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  onSubmit?: (value: string) => void;
};

/** Global search input — same field chrome as forms and dropdowns. */
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
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(fieldControlClass, 'ps-9 pe-9')}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => onChange('')}
        >
          <X size={14} />
        </button>
      )}
    </form>
  );
}

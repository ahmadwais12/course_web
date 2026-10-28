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
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-10 pl-9 pr-9 rounded-[7px] text-sm bg-muted border border-border text-foreground',
          'placeholder:text-muted-foreground outline-none',
          'focus:border-primary focus:ring-1 focus:ring-primary'
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
          onClick={() => onChange('')}
        >
          <X size={14} />
        </button>
      )}
    </form>
  );
}

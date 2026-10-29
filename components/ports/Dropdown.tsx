'use client';

import React from 'react';
import SearchableSelect, { type SelectOption } from '@/components/ui/SearchableSelect';
import { cn } from '@/lib/utils';

type DropdownProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  filterPlaceholder?: string;
  filter?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  className?: string;
};

/** Port wrapper around searchable dropdown */
export default function Dropdown({
  label,
  className,
  ...props
}: DropdownProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <label className="block text-sm font-medium text-foreground">{label}</label>}
      <SearchableSelect {...props} />
    </div>
  );
}

export type { SelectOption };

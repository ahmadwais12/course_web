'use client';

import React from 'react';
import SearchableSelect, { type SelectOption } from '@/components/ui/SearchableSelect';
import { cn } from '@/lib/utils';
import FieldLabel from './FieldLabel';

type DropdownProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  filterPlaceholder?: string;
  /** Search inside the menu is always on. Kept for call-site compatibility. */
  filter?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  required?: boolean;
  hint?: string;
  className?: string;
};

/** Searchable dropdown — the standard form select for every page. */
export default function Dropdown({
  label,
  className,
  required,
  hint,
  filter: _filter,
  ...props
}: DropdownProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <SearchableSelect {...props} filter />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export type { SelectOption };

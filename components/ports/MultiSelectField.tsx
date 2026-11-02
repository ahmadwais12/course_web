'use client';

import React from 'react';
import MultiSelect from '@/components/ui/MultiSelect';
import type { SelectOption } from '@/components/ui/SearchableSelect';
import { cn } from '@/lib/utils';
import FieldLabel from './FieldLabel';

type MultiSelectFieldProps = {
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  filterPlaceholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  required?: boolean;
  hint?: string;
  maxSelectedLabels?: number;
  className?: string;
};

/** Searchable multi-select — same field chrome as Dropdown. */
export default function MultiSelectField({
  label,
  className,
  required,
  hint,
  ...props
}: MultiSelectFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <MultiSelect {...props} filter />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

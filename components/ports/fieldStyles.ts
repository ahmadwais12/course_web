import { cn } from '@/lib/utils';

/** Shared chrome for every form control — matches the searchable dropdown. */
export const fieldLabelClass = 'block text-sm font-medium text-foreground';

export const fieldControlClass = cn(
  'h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground',
  'placeholder:text-muted-foreground outline-none transition-[background-color,color,border-color,outline-color,box-shadow] duration-200',
  'hover:border-primary/60',
  'focus:border-primary focus:ring-1 focus:ring-primary',
  'disabled:cursor-not-allowed disabled:opacity-60'
);

export const fieldTriggerClass = cn(
  'emis-select flex min-h-10 w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-left',
  'text-foreground transition-[background-color,color,border-color,outline-color,box-shadow] duration-200 hover:border-primary/60',
  'disabled:cursor-not-allowed disabled:opacity-60'
);

export const fieldTriggerOpenClass = 'border-primary ring-1 ring-primary';
export const fieldInvalidClass = 'border-destructive ring-1 ring-destructive';

export const fieldOverlayClass =
  'absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg';

export const fieldOverlaySearchClass =
  'flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5';

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
};

/** Shared text/number/date input design */
export default function InputField({
  label,
  hint,
  error,
  className,
  containerClassName,
  id,
  ...props
}: InputFieldProps) {
  const inputId = id || props.name;
  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="ms-0.5 text-destructive">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'h-10 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground shadow-sm',
          'placeholder:text-muted-foreground outline-none transition-all duration-200',
          'hover:border-primary/35 dark:hover:border-primary/40',
          'focus:border-primary focus:ring-4 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-60',
          error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
          className
        )}
        {...props}
      />
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

type TextAreaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export function TextAreaField({ label, error, className, id, ...props }: TextAreaFieldProps) {
  const inputId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'min-h-[96px] w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm',
          'placeholder:text-muted-foreground outline-none transition-all duration-200',
          'hover:border-primary/35 dark:hover:border-primary/40',
          'focus:border-primary focus:ring-4 focus:ring-primary/20',
          error && 'border-destructive',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

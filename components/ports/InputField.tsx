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
          {props.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full h-10 px-3 rounded-[7px] text-sm bg-muted border border-border text-foreground',
          'placeholder:text-muted-foreground outline-none transition-colors',
          'focus:border-primary focus:ring-1 focus:ring-primary',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error && 'border-destructive focus:border-destructive focus:ring-destructive',
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
          'w-full min-h-[96px] px-3 py-2 rounded-[7px] text-sm bg-muted border border-border text-foreground',
          'placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary',
          error && 'border-destructive',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

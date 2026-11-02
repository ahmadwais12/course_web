'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import FieldLabel from './FieldLabel';
import { fieldControlClass, fieldInvalidClass } from './fieldStyles';

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
};

/** Shared text/number/date input — same chrome as the searchable dropdown. */
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
        <FieldLabel htmlFor={inputId} required={props.required}>
          {label}
        </FieldLabel>
      )}
      <input
        id={inputId}
        className={cn(fieldControlClass, error && fieldInvalidClass, className)}
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
  hint?: string;
  error?: string;
  required?: boolean;
};

export function TextAreaField({
  label,
  hint,
  error,
  className,
  id,
  required,
  ...props
}: TextAreaFieldProps) {
  const inputId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <FieldLabel htmlFor={inputId} required={required}>
          {label}
        </FieldLabel>
      )}
      <textarea
        id={inputId}
        required={required}
        className={cn(fieldControlClass, 'h-auto min-h-[96px] py-2.5', error && fieldInvalidClass, className)}
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

type PasswordFieldProps = Omit<InputFieldProps, 'type'> & {
  toggleLabel?: string;
};

export function PasswordField({
  label,
  hint,
  error,
  className,
  containerClassName,
  id,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id || props.name;
  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {label && (
        <FieldLabel htmlFor={inputId} required={props.required}>
          {label}
        </FieldLabel>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={cn(fieldControlClass, 'pe-10', error && fieldInvalidClass, className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

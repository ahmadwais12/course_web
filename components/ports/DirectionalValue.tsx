'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  formatAmountInput,
  formatPhone,
  formatPrice,
  normalizePhone,
  parseAmount,
} from '@/lib/format';
import InputField from './InputField';

/** Price/phone text always stays LTR and isolated inside RTL layouts. */
export function PriceText({
  value,
  currency = '',
  className,
}: {
  value: unknown;
  currency?: string;
  className?: string;
}) {
  const text = formatPrice(value, currency);
  return (
    <span dir="ltr" className={cn('num-ltr inline-block', className)}>
      {text}
    </span>
  );
}

export function PhoneText({
  value,
  link = false,
  className,
}: {
  value: unknown;
  link?: boolean;
  className?: string;
}) {
  const display = formatPhone(value);
  if (!display) return <span className="text-muted-foreground">—</span>;
  const e164 = normalizePhone(value);
  if (link && e164) {
    return (
      <a
        href={`tel:${e164}`}
        dir="ltr"
        className={cn('num-ltr inline-block hover:underline', className)}
      >
        {display}
      </a>
    );
  }
  return (
    <span dir="ltr" className={cn('num-ltr inline-block', className)}>
      {display}
    </span>
  );
}

type PriceFieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
  value: string;
  onChange: (value: string) => void;
};

/** Price input: groups thousands while typing, strips separators for the model value. */
export function PriceField({
  value,
  onChange,
  label,
  hint,
  error,
  containerClassName,
  className,
  onBlur,
  ...props
}: PriceFieldProps) {
  const [display, setDisplay] = useState(() => formatAmountInput(value));

  useEffect(() => {
    setDisplay(formatAmountInput(value));
  }, [value]);

  return (
    <InputField
      {...props}
      label={label}
      hint={hint}
      error={error}
      containerClassName={containerClassName}
      dir="ltr"
      inputMode="decimal"
      autoComplete="off"
      className={cn('num-ltr-input', className)}
      value={display}
      onChange={(e) => {
        const next = formatAmountInput(e.target.value);
        setDisplay(next);
        onChange(next);
      }}
      onBlur={(e) => {
        const raw = parseAmount(display);
        onChange(raw == null ? '' : String(raw));
        setDisplay(formatAmountInput(e.target.value));
        onBlur?.(e);
      }}
    />
  );
}

type PhoneFieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
  value: string;
  onChange: (value: string) => void;
};

/** Phone input: stays LTR in RTL pages and normalizes to E.164 on blur. */
export function PhoneField({
  value,
  onChange,
  label,
  hint,
  error,
  containerClassName,
  className,
  onBlur,
  ...props
}: PhoneFieldProps) {
  const [display, setDisplay] = useState(() => formatPhone(value));

  useEffect(() => {
    setDisplay(formatPhone(value));
  }, [value]);

  return (
    <InputField
      {...props}
      label={label}
      hint={hint}
      error={error}
      containerClassName={containerClassName}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      dir="ltr"
      className={cn('num-ltr-input', className)}
      value={display}
      onChange={(e) => {
        setDisplay(e.target.value);
        onChange(e.target.value);
      }}
      onBlur={(e) => {
        const normalized = normalizePhone(e.target.value);
        onChange(normalized);
        setDisplay(formatPhone(normalized));
        onBlur?.(e);
      }}
    />
  );
}

'use client';

import React from 'react';
import { fieldLabelClass } from './fieldStyles';

type FieldLabelProps = {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
};

export default function FieldLabel({ htmlFor, required, children }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className={fieldLabelClass}>
      {children}
      {required && <span className="ms-0.5 text-destructive">*</span>}
    </label>
  );
}

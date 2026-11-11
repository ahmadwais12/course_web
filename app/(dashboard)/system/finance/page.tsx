'use client';

import SettingsForm, { type SettingField } from '@/components/system/SettingsForm';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const FIELDS: SettingField[] = [
  {
    key: 'currency',
    label: 'Default currency',
    type: 'select',
    options: [
      { value: 'AFN', label: 'AFN — Afghan Afghani' },
      { value: 'USD', label: 'USD — US Dollar' },
      { value: 'EUR', label: 'EUR — Euro' },
      { value: 'PKR', label: 'PKR — Pakistani Rupee' },
      { value: 'IRR', label: 'IRR — Iranian Rial' },
    ],
  },
  {
    key: 'fiscalYearStart',
    label: 'Fiscal year starts',
    type: 'select',
    options: MONTHS.map((month) => ({ value: month, label: month })),
  },
  { key: 'invoicePrefix', label: 'Invoice prefix', type: 'text', placeholder: 'INV' },
  { key: 'paymentTermsDays', label: 'Payment terms (days)', type: 'number', hint: 'Days until an invoice is due' },
  { key: 'taxRate', label: 'Tax rate (%)', type: 'number' },
  { key: 'lateFeePercent', label: 'Late fee (%)', type: 'number', hint: 'Applied to overdue balances' },
  {
    key: 'autoInvoice',
    label: 'Generate invoices automatically',
    type: 'toggle',
    hint: 'Create invoices when students are enrolled',
  },
  {
    key: 'allowPartialPayments',
    label: 'Allow partial payments',
    type: 'toggle',
    hint: 'Accept payments smaller than the invoice balance',
  },
];

const DEFAULTS = {
  currency: 'AFN',
  fiscalYearStart: 'January',
  invoicePrefix: 'INV',
  paymentTermsDays: '30',
  taxRate: '0',
  lateFeePercent: '0',
  autoInvoice: false,
  allowPartialPayments: true,
};

export default function FinanceSettingsPage() {
  return (
    <SettingsForm
      scope="finance"
      title="Finance Settings"
      description="Currency, invoicing, payment terms, and billing behaviour for the institute."
      sectionTitle="Billing preferences"
      sectionDescription="These defaults apply to new fee structures, invoices, and receipts."
      fields={FIELDS}
      defaults={DEFAULTS}
    />
  );
}

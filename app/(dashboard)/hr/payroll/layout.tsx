import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Payroll',
  'Monthly salary register with gross pay, allowances, deductions, net pay, and payslip status.',
  '/hr/payroll'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

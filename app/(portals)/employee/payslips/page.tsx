import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeePayslipsScreen } from '@/components/portal/employee/EmployeeScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Payslips',
  'Monthly salary history with allowances, deductions, and net pay breakdown.',
  '/employee/payslips'
);

export default function EmployeePayslipsPage() {
  return <EmployeePayslipsScreen />;
}

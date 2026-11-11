import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeeDashboardScreen } from '@/components/portal/employee/EmployeeScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Employee Portal',
  'Your employment dashboard with attendance, leave balance, payslips, and assigned work.',
  '/employee'
);

export default function EmployeeDashboardPage() {
  return <EmployeeDashboardScreen />;
}

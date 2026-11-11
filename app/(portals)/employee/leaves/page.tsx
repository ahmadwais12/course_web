import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeeLeavesScreen } from '@/components/portal/employee/EmployeeScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Leave Requests',
  'Apply for leave, review approval status, and track your remaining leave balance.',
  '/employee/leaves'
);

export default function EmployeeLeavesPage() {
  return <EmployeeLeavesScreen />;
}

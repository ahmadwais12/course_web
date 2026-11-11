import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeeProfileScreen } from '@/components/portal/employee/EmployeeScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Employment Profile',
  'Employment contract, department, and contact details for the signed-in staff member.',
  '/employee/profile'
);

export default function EmployeeProfilePage() {
  return <EmployeeProfileScreen />;
}

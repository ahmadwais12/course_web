import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeeRequestsScreen } from '@/components/portal/employee/EmployeeExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'HR Requests',
  'Raise HR requests and track their status.',
  '/employee/requests'
);

export default function Page() {
  return <EmployeeRequestsScreen />;
}

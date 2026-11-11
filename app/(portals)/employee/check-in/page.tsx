import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeeCheckInScreen } from '@/components/portal/employee/EmployeeExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Check In / Out',
  'Record your daily attendance from the portal.',
  '/employee/check-in'
);

export default function Page() {
  return <EmployeeCheckInScreen />;
}

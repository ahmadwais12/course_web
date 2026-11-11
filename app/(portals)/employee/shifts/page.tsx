import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeeShiftsScreen } from '@/components/portal/employee/EmployeeExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Shift',
  'Your shift, contract, and weekly schedule.',
  '/employee/shifts'
);

export default function Page() {
  return <EmployeeShiftsScreen />;
}

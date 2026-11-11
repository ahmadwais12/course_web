import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeeHoursScreen } from '@/components/portal/employee/EmployeeExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Working Hours',
  'Hours calculated from your attendance records.',
  '/employee/hours'
);

export default function Page() {
  return <EmployeeHoursScreen />;
}

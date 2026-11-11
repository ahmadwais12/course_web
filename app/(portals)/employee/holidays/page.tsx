import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeeHolidaysScreen } from '@/components/portal/employee/EmployeeExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Holidays',
  'School holidays published for staff.',
  '/employee/holidays'
);

export default function Page() {
  return <EmployeeHolidaysScreen />;
}

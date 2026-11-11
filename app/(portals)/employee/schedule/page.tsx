import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeeScheduleScreen } from '@/components/portal/employee/EmployeeExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Schedule',
  'Your weekly timetable and duty slots.',
  '/employee/schedule'
);

export default function Page() {
  return <EmployeeScheduleScreen />;
}

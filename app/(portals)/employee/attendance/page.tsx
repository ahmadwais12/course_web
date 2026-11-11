import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeeAttendanceScreen } from '@/components/portal/employee/EmployeeScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Attendance',
  'Monthly attendance record and summary for the signed-in staff member.',
  '/employee/attendance'
);

export default function EmployeeAttendancePage() {
  return <EmployeeAttendanceScreen />;
}

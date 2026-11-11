import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentAttendanceScreen } from '@/components/portal/student/StudentScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Attendance',
  'Daily attendance history and monthly attendance summary.',
  '/student/attendance'
);

export default function StudentAttendancePage() {
  return <StudentAttendanceScreen />;
}

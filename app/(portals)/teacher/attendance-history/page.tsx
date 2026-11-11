import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherAttendanceHistoryScreen } from '@/components/portal/teacher/TeacherExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Attendance History',
  'Recorded student attendance for your classes.',
  '/teacher/attendance-history'
);

export default function Page() {
  return <TeacherAttendanceHistoryScreen />;
}

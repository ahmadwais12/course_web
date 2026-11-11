import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherAttendanceScreen } from '@/components/portal/teacher/TeacherScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Take Attendance',
  'Record daily attendance for an assigned class and section.',
  '/teacher/attendance'
);

export default function TeacherAttendancePage() {
  return <TeacherAttendanceScreen />;
}

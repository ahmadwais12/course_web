import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherAttendanceReportsScreen } from '@/components/portal/teacher/TeacherExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Attendance Reports',
  'Attendance analysis across your assigned classes.',
  '/teacher/attendance-reports'
);

export default function Page() {
  return <TeacherAttendanceReportsScreen />;
}

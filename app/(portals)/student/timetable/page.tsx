import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentTimetableScreen } from '@/components/portal/student/StudentScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Timetable',
  'Weekly class timetable with subjects, teachers, and rooms.',
  '/student/timetable'
);

export default function StudentTimetablePage() {
  return <StudentTimetableScreen />;
}

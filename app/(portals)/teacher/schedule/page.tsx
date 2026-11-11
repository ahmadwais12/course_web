import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherScheduleScreen } from '@/components/portal/teacher/TeacherScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Teaching Schedule',
  'Weekly teaching timetable by class, subject, and room.',
  '/teacher/schedule'
);

export default function TeacherSchedulePage() {
  return <TeacherScheduleScreen />;
}

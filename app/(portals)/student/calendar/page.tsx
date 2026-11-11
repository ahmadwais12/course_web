import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentCalendarScreen } from '@/components/portal/student/StudentExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Calendar',
  'Events, exams, and holidays for your class in one calendar.',
  '/student/calendar'
);

export default function Page() {
  return <StudentCalendarScreen />;
}

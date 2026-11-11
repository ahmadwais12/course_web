import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentProgressScreen } from '@/components/portal/student/StudentServiceScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Academic Progress',
  'Subject performance, examination history, and tracked academic progress.',
  '/student/progress'
);

export default function StudentProgressPage() {
  return <StudentProgressScreen />;
}

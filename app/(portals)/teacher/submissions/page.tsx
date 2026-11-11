import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherSubmissionsScreen } from '@/components/portal/teacher/TeacherExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Student Submissions',
  'Review, grade, and give feedback on student work.',
  '/teacher/submissions'
);

export default function Page() {
  return <TeacherSubmissionsScreen />;
}

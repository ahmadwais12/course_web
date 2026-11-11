import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentSubmissionsScreen } from '@/components/portal/student/StudentExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Submissions',
  'Homework and assignment submissions you have uploaded.',
  '/student/submissions'
);

export default function Page() {
  return <StudentSubmissionsScreen />;
}

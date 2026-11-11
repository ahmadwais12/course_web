import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentResultsScreen } from '@/components/portal/student/StudentExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Results',
  'Published examination results and subject grades.',
  '/student/results'
);

export default function Page() {
  return <StudentResultsScreen />;
}

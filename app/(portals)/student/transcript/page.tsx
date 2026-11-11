import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentTranscriptScreen } from '@/components/portal/student/StudentExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Academic Transcript',
  'A printable record of your academic results.',
  '/student/transcript'
);

export default function Page() {
  return <StudentTranscriptScreen />;
}

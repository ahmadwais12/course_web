import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentLibraryScreen } from '@/components/portal/student/StudentServiceScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Library',
  'Borrowed books, the library catalogue, and digital resources for students.',
  '/student/library'
);

export default function StudentLibraryPage() {
  return <StudentLibraryScreen />;
}

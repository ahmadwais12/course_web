import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentDocumentsScreen } from '@/components/portal/student/StudentScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Documents',
  'Student documents, certificates, transcripts, and verification status.',
  '/student/documents'
);

export default function StudentDocumentsPage() {
  return <StudentDocumentsScreen />;
}

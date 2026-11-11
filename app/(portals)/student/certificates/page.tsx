import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentCertificatesScreen } from '@/components/portal/student/StudentScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Certificates',
  'Certificates issued to you and requests awaiting approval.',
  '/student/certificates'
);

export default function StudentCertificatesPage() {
  return <StudentCertificatesScreen />;
}

import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentEnrollmentScreen } from '@/components/portal/student/StudentScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Enrollment',
  'Your current class placement, academic year, and enrollment history.',
  '/student/enrollment'
);

export default function StudentEnrollmentPage() {
  return <StudentEnrollmentScreen />;
}

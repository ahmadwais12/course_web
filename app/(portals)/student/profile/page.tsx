import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentProfileScreen } from '@/components/portal/student/StudentScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Student Profile',
  'Personal, guardian, and academic details for the signed-in student.',
  '/student/profile'
);

export default function StudentProfilePage() {
  return <StudentProfileScreen />;
}

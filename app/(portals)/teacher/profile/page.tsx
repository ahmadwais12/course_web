import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherProfileScreen } from '@/components/portal/teacher/TeacherScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Teacher Profile',
  'Employment and academic details for the signed-in teacher.',
  '/teacher/profile'
);

export default function TeacherProfilePage() {
  return <TeacherProfileScreen />;
}

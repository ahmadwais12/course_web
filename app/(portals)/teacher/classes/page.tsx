import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherClassesScreen } from '@/components/portal/teacher/TeacherScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Classes',
  'Classes and subjects assigned to the signed-in teacher.',
  '/teacher/classes'
);

export default function TeacherClassesPage() {
  return <TeacherClassesScreen />;
}

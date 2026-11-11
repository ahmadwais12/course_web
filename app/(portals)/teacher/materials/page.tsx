import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherMaterialsScreen } from '@/components/portal/teacher/TeacherScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Learning Materials',
  'Create lesson plans and share learning materials with your classes.',
  '/teacher/materials'
);

export default function TeacherMaterialsPage() {
  return <TeacherMaterialsScreen />;
}

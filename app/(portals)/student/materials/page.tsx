import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentMaterialsScreen } from '@/components/portal/student/StudentExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Learning Materials',
  'Lesson plans and study materials shared by your teachers.',
  '/student/materials'
);

export default function Page() {
  return <StudentMaterialsScreen />;
}

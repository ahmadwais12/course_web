import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentPlacementTestsScreen } from '@/components/portal/student/StudentServiceScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Placement Tests',
  'Available placement tests and the results of previous assessments.',
  '/student/placement-tests'
);

export default function StudentPlacementTestsPage() {
  return <StudentPlacementTestsScreen />;
}

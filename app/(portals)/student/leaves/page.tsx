import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentLeavesScreen } from '@/components/portal/student/StudentServiceScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Leave Requests',
  'Request leave from class and track approval from the academic office.',
  '/student/leaves'
);

export default function StudentLeavesPage() {
  return <StudentLeavesScreen />;
}

import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherWorkloadScreen } from '@/components/portal/teacher/TeacherServiceScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Teaching Workload',
  'Assigned teaching hours, utilisation, and class load breakdown.',
  '/teacher/workload'
);

export default function TeacherWorkloadPage() {
  return <TeacherWorkloadScreen />;
}

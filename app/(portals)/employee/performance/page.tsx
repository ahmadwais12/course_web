import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeePerformanceScreen } from '@/components/portal/employee/EmployeeScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Performance',
  'Your appraisal rating, attendance, and review schedule.',
  '/employee/performance'
);

export default function EmployeePerformancePage() {
  return <EmployeePerformanceScreen />;
}

import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeeTasksScreen } from '@/components/portal/employee/EmployeeScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Tasks & Schedule',
  'Work assigned to you and your weekly timetable.',
  '/employee/tasks'
);

export default function EmployeeTasksPage() {
  return <EmployeeTasksScreen />;
}

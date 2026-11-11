import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { LeaveDashboardScreen } from '@/components/portal/leave/LeaveScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Leave Dashboard',
  'Leave overview with pending and approved requests, approved days, and upcoming holidays.',
  '/leave'
);

export default function LeaveDashboardPage() {
  return <LeaveDashboardScreen />;
}

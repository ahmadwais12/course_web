import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { LeaveRequestsScreen } from '@/components/portal/leave/LeaveScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Leave Requests',
  'Submit leave requests, review approval status, and keep a full leave history.',
  '/leave/requests'
);

export default function LeaveRequestsPage() {
  return <LeaveRequestsScreen />;
}

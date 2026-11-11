import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { LeaveApprovalsScreen } from '@/components/portal/leave/LeaveScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Leave Approvals',
  'Review and approve or reject student and employee leave requests routed to you.',
  '/leave/approvals'
);

export default function LeaveApprovalsPage() {
  return <LeaveApprovalsScreen />;
}

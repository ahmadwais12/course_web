import type { Metadata } from 'next';
import PortalShell from '@/components/portal/PortalShell';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Leave Portal',
  'Leave self-service for students and employees: request leave, track approvals, and view holidays.',
  '/leave'
);

export default function LeavePortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell portal="leave">{children}</PortalShell>;
}

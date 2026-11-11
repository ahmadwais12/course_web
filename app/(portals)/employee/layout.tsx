import type { Metadata } from 'next';
import PortalShell from '@/components/portal/PortalShell';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Employee Portal',
  'Employee self-service portal: employment profile, attendance, leave requests, payslips, and HR documents.',
  '/employee'
);

export default function EmployeePortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell portal="employee">{children}</PortalShell>;
}

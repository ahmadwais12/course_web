import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeeDocumentsScreen } from '@/components/portal/employee/EmployeeScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Employment Documents',
  'Contracts, certificates, and other documents attached to your staff record.',
  '/employee/documents'
);

export default function EmployeeDocumentsPage() {
  return <EmployeeDocumentsScreen />;
}

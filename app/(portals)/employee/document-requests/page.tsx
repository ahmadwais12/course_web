import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { EmployeeDocumentRequestsScreen } from '@/components/portal/employee/EmployeeServiceScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Document Requests',
  'Request employment letters and HR documents and track their progress.',
  '/employee/document-requests'
);

export default function EmployeeDocumentRequestsPage() {
  return <EmployeeDocumentRequestsScreen />;
}

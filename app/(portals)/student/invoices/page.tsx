import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentInvoicesScreen } from '@/components/portal/student/StudentExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Invoices',
  'Invoices issued to you with payment status.',
  '/student/invoices'
);

export default function Page() {
  return <StudentInvoicesScreen />;
}

import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentFinanceScreen } from '@/components/portal/student/StudentScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Fees & Invoices',
  'Fee summary, invoices, payments, outstanding balance, and receipts.',
  '/student/finance'
);

export default function StudentFinancePage() {
  return <StudentFinanceScreen />;
}

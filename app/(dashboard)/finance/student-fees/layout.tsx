import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Student Fees',
  'Assigned fees, payments, and outstanding balances for each student.',
  '/finance/student-fees'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

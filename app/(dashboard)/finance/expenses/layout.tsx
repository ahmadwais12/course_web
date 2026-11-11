import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Expenses',
  'Record and categorize institute expenses with vendors, approval status, and payment methods.',
  '/finance/expenses'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

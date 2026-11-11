import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Chart of Accounts',
  'Organize assets, liabilities, equity, income, and expense accounts into a structured chart.',
  '/finance/chart-of-accounts'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Accounts',
  'Cash, bank, and ledger accounts with the current cash position and expense totals.',
  '/finance/accounts'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

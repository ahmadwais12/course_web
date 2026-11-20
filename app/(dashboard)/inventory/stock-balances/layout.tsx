import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Stock Balances',
  'On-hand quantity and value for every stock item with minimum-level flags.',
  '/inventory/stock-balances'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

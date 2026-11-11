import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Inventory Transactions',
  'Browse every stock in and stock out movement in one list with type, item, and warehouse filters.',
  '/inventory/transactions'
);

export default function PageSeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

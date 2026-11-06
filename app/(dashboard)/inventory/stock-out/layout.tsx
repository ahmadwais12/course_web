import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Stock Out',
  'Issue stock when the quantity does not exceed the current on-hand balance.',
  '/inventory/stock-out'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

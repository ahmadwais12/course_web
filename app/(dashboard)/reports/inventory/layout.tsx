import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Inventory Reports',
  'On-hand totals, stock health against minimums, unit mix, and six-month in and out counts.',
  '/reports/inventory'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

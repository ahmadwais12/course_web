import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Inventory Items',
  'Create and manage inventory items, bin cards, units, on-hand quantity, minimums, and prices.',
  '/inventory/items'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

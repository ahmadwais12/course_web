import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Assets & Inventory',
  'Fixed-asset register valuation, depreciation, stock value, and purchase commitments connected to finance.',
  '/finance/assets-inventory'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

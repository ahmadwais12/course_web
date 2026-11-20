import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Goods Received (GRN)',
  'Record goods received against purchases with quantity, warehouse, and receiving officer.',
  '/inventory/grn'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

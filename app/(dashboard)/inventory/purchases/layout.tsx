import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Purchases',
  'Create purchase orders from suppliers and receive goods into inventory stock.',
  '/inventory/purchases'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

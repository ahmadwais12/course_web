import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'IMS Asset Holders',
  'Inventory staff directory with employee IDs, departments, and duty stations.',
  '/inventory/ims-holders'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Modified Inventory Settings',
  'Change history for inventory settings updates.',
  '/inventory/modified-settings'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Categories',
  'Manage asset categories used when registering fixed assets.',
  '/inventory/categories'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

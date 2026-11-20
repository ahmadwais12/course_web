import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Depreciation',
  'Annual, accumulated, and book values for depreciable assets.',
  '/inventory/depreciation'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

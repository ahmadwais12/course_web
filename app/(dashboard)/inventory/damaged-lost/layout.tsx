import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Damaged and Lost',
  'Report assets or stock that were damaged, lost, or written off.',
  '/inventory/damaged-lost'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

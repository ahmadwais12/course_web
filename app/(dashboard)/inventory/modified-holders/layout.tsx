import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Modified Asset Holders',
  'Change history for asset holder records.',
  '/inventory/modified-holders'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

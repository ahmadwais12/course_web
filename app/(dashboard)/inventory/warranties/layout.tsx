import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Warranties',
  'Warranty coverage, providers, and expiry dates for assets.',
  '/inventory/warranties'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

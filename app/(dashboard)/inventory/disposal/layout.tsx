import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Disposal',
  'Record approved disposals by sale, scrap, donation, or write-off.',
  '/inventory/disposal'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

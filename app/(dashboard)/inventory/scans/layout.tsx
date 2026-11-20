import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Scan and Field Work',
  'Log QR or barcode scans during field verification with station and result.',
  '/inventory/scans'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

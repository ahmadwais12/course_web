import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'QR Tag Printing',
  'Printable QR labels for asset tags and item bin cards.',
  '/inventory/qr-printing'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

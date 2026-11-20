import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Asset Verification',
  'Physical asset verification dashboard with branch progress, found and missing assets, and discrepancies.',
  '/inventory/verification'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

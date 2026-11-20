import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Verification Discrepancies',
  'Investigate and resolve physical verification discrepancies: missing assets, wrong locations, damage, and more.',
  '/inventory/verification/discrepancies'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

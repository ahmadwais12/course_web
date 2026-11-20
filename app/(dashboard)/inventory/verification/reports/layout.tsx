import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Verification Reports',
  'Export branch verification, missing asset, condition, unregistered, and verification history reports.',
  '/inventory/verification/reports'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Units',
  'Manage units of measure used by inventory items.',
  '/inventory/units'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

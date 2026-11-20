import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Repairs and Service',
  'Repair and service jobs for assets with vendor, cost, and turnaround.',
  '/inventory/repairs'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

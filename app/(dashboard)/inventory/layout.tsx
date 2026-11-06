import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Inventory Dashboard',
  'Stock levels, movement trend, unit mix, and fixed-asset status by department and location.',
  '/inventory'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

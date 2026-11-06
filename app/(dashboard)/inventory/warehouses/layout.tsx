import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Warehouses',
  'Manage warehouse locations used on stock in and stock out movements.',
  '/inventory/warehouses'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

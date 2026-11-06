import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Stock In',
  'Record stock received and add it to the item on-hand quantity.',
  '/inventory/stock-in'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

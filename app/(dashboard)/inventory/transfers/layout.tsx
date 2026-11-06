import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Transfers',
  'Record asset moves between holders, departments, locations, and provinces.',
  '/inventory/transfers'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Movement Report',
  'Review stock in and stock out activity for any date range.',
  '/inventory/movements'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

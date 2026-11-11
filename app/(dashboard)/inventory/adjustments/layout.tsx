import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Stock Adjustments',
  'Correct inventory quantities after physical counts, damage, loss, or data errors.',
  '/inventory/adjustments'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

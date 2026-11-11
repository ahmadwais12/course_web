import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Vouchers',
  'Receipt, payment, and journal vouchers combined in a single finance register.',
  '/finance/vouchers'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

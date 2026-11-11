import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Income',
  'Fee collections and other recorded receipts with monthly totals and payment methods.',
  '/finance/income'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

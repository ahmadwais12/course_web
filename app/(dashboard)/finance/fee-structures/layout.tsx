import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Fee Structures',
  'Define fee plans per program, class, and academic year with amounts and billing frequency.',
  '/finance/fee-structures'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

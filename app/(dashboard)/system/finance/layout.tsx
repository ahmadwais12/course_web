import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Finance Settings',
  'Currency, invoicing, payment terms, and billing behaviour for the institute.',
  '/system/finance'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

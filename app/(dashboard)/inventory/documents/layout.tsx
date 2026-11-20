import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Document Archive',
  'Archive policies, contracts, invoices, insurance, and warranty papers.',
  '/inventory/documents'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

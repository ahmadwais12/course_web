import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Suppliers',
  'Manage inventory suppliers, their contact details, and purchase history.',
  '/inventory/suppliers'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

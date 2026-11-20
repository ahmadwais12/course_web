import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Backups',
  'Create and download ZIP snapshots of the inventory data files.',
  '/inventory/backups'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Asset Trash',
  'Restore deleted assets or remove them permanently.',
  '/inventory/assets/trash'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

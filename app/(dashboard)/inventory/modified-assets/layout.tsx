import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Modified Assets',
  'Change history for asset records — creations, edits, trash, restore, and deletion.',
  '/inventory/modified-assets'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

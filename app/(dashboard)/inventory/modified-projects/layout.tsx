import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Modified Projects',
  'Change history for project records — creations, edits, and deletion.',
  '/inventory/modified-projects'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

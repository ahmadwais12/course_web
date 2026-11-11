import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Languages',
  'Default language and the languages the institute offers.',
  '/system/languages'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

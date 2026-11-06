import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Assets',
  'Register fixed assets with a tag, holder, category, project, and status.',
  '/inventory/assets'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

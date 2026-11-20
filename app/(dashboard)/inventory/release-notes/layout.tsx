import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Release Notes',
  'What changed in the inventory module, newest first.',
  '/inventory/release-notes'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

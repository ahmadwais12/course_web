import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Account Directory',
  'Read-only directory of accounts and their assigned roles.',
  '/observers/directory'
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

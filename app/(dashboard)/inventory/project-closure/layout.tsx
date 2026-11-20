import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Project Closure',
  'Close out projects and confirm all project assets were returned.',
  '/inventory/project-closure'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

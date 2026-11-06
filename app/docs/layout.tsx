import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Docs',
  description:
    'DreamFlow documentation — get started, manage businesses, durations, users, and System Viewer analytics.',
  path: '/docs',
  keywords: ['DreamFlow', 'docs', 'documentation', 'EMIS guide'],
});

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

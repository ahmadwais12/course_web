import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Download',
  description:
    'Download DreamFlow clients — website access, mobile app, and desktop EXE for Windows.',
  path: '/download',
  keywords: ['DreamFlow', 'download', 'desktop EXE', 'mobile app'],
});

export default function DownloadLayout({ children }: { children: React.ReactNode }) {
  return children;
}

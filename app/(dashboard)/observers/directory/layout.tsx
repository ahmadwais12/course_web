import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'System Viewer — Visitors',
  'Visitor sessions for website, mobile app, and desktop EXE clients.',
  '/observers/directory'
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

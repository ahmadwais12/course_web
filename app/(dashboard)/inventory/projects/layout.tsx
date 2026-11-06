import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Projects',
  'Manage projects linked to fixed assets, including donor, dates, status, and budget.',
  '/inventory/projects'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

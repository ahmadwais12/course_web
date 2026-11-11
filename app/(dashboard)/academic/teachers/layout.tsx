import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Academic Teachers',
  'Teaching staff directory with department, qualification, workload, and class load.',
  '/academic/teachers'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

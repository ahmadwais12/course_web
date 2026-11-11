import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Academic Reports',
  'Exam performance, class averages, pass rates, and grade distribution.',
  '/reports/academic'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

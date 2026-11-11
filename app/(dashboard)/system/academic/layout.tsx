import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Academic Settings',
  'Grading scale, passing marks, attendance thresholds, and enrollment rules.',
  '/system/academic'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

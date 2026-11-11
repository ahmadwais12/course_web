import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Exams',
  'Exam calendar with marks, passing thresholds, and grading progress.',
  '/academic/exams'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Timetable',
  'Weekly lesson schedule by class, teacher, and room.',
  '/academic/timetable'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

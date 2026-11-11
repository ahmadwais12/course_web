import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Subjects',
  'Subject catalogue mapped to departments with credits and class usage.',
  '/academic/subjects'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

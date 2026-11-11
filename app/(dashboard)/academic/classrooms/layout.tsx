import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Classrooms',
  'Rooms, labs, and lecture halls with capacity, type, and scheduled lessons.',
  '/academic/classrooms'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

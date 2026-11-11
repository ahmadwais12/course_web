import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Departments',
  'Academic departments with their head, programs, and subject load.',
  '/organization/departments'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

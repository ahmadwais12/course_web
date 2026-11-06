import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Asset Properties',
  'Manage category, department, location, and province values used on assets.',
  '/inventory/properties'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

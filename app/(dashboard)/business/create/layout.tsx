import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Create Business',
  'Create a business with bio, contact details, city, services, logo, and cover image.',
  '/business/create'
);

export default function PageSeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

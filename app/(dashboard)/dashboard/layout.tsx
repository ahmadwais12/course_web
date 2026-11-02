import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Dashboard',
  'General DreamFlow dashboard with system-wide KPIs, charts, and role dashboards for finance, staff, teachers, and students.',
  '/dashboard'
);

export default function PageSeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

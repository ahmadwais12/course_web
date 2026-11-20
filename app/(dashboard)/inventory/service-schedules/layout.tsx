import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Service Schedules',
  'Planned maintenance cycles and due dates for assets.',
  '/inventory/service-schedules'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

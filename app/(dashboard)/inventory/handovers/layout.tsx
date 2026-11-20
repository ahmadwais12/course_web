import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Handover Management',
  'Assign assets and inventory to projects or employees with approvals, receipt confirmation, custody, and returns.',
  '/inventory/handovers'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

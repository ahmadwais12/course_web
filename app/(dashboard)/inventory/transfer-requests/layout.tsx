import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Transfer Requests',
  'Requests to move assets between holders, departments, or locations.',
  '/inventory/transfer-requests'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

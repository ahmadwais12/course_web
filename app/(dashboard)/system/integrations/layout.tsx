import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Integrations',
  'Manage API keys and webhooks that connect the institute to external systems.',
  '/system/integrations'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

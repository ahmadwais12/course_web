import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'AI Assistant',
  'Ask the DreamFlow AI Assistant how to use the platform and get summaries of your organization’s data.',
  '/ai-assistant'
);

export default function PageSeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

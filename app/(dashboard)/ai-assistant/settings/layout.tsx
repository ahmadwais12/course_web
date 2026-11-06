import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'AI Settings',
  'View your organization’s AI Assistant usage, choose which roles can use it, and manage knowledge documents.',
  '/ai-assistant/settings'
);

export default function PageSeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

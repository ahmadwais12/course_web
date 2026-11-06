import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'AI Management',
  'Configure the shared Gemini AI provider, organization AI limits, plan quotas, pricing, usage, and the platform knowledge base.',
  '/system/ai'
);

export default function PageSeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

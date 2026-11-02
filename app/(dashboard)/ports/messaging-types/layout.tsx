import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Messaging Types',
  'Create and manage messaging types used when starting chats.',
  '/ports/messaging-types'
);

export default function PageSeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

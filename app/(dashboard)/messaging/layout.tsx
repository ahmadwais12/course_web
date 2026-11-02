import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Messaging',
  'WhatsApp-style inbox with mute, block, polls, disappearing messages, starred chats, and contact info.',
  '/messaging'
);

export default function PageSeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

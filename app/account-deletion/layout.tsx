import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Delete Your Account',
  description:
    'Request deletion of your DreamFlow account and personal data from the website or the mobile app, and see what is deleted and when.',
  path: '/account-deletion',
  keywords: ['DreamFlow', 'delete account', 'account deletion', 'data deletion', 'privacy'],
});

export default function AccountDeletionLayout({ children }: { children: React.ReactNode }) {
  return children;
}

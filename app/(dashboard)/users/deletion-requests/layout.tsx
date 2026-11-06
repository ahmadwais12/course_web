import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Account Deletion Requests',
  'Review requests to delete user accounts, then delete the account or reject the request with a note.',
  '/users/deletion-requests'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

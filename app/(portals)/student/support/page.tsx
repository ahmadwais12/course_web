import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentSupportScreen } from '@/components/portal/student/StudentExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Support',
  'Raise a support ticket and track its resolution.',
  '/student/support'
);

export default function Page() {
  return <StudentSupportScreen />;
}

import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { PortalSettingsScreen } from '@/components/portal/PortalSharedScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Settings',
  'Appearance, language, and account security.',
  '/student/settings'
);

export default function Page() {
  return <PortalSettingsScreen scope="student" portalName="Student" />;
}

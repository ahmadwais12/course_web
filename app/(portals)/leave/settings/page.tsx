import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { PortalSettingsScreen } from '@/components/portal/PortalSharedScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Leave Portal Settings',
  'Appearance, language, and account security settings for the Leave portal.',
  '/leave/settings'
);

export default function LeaveSettingsPage() {
  return <PortalSettingsScreen scope="leave" portalName="Leave Portal" />;
}

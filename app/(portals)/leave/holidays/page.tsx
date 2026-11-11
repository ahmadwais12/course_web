import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { LeaveHolidaysScreen } from '@/components/portal/leave/LeaveScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Holidays',
  'Published holidays for leave planning, including recurring annual closures.',
  '/leave/holidays'
);

export default function LeaveHolidaysPage() {
  return <LeaveHolidaysScreen />;
}

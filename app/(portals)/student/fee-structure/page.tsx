import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentFeeStructureScreen } from '@/components/portal/student/StudentExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Fee Structure',
  'Fees that apply to your class and program.',
  '/student/fee-structure'
);

export default function Page() {
  return <StudentFeeStructureScreen />;
}

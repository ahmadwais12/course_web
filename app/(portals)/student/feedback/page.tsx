import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentFeedbackScreen } from '@/components/portal/student/StudentServiceScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Feedback',
  'Submit feedback about courses, teaching, facilities, and services.',
  '/student/feedback'
);

export default function StudentFeedbackPage() {
  return <StudentFeedbackScreen />;
}

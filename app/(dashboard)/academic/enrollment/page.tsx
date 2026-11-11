'use client';

import EnrollmentManager from '@/components/academic/EnrollmentManager';

export default function EnrollmentPage() {
  return (
    <EnrollmentManager
      title="Enrollment"
      description="Students mapped to a class and academic year, with enrollment status."
      primaryLabel="Enroll Student"
      emptyMessage="No enrollments recorded yet."
    />
  );
}

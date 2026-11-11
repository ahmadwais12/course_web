'use client';

import EnrollmentManager from '@/components/academic/EnrollmentManager';

export default function AdmissionEnrollmentPage() {
  return (
    <EnrollmentManager
      title="Admission Enrollment"
      description="Turn admitted applicants into enrolled students with a class and academic year."
      primaryLabel="Enroll Admitted Student"
      emptyMessage="No admitted students enrolled yet. Enroll the first student to confirm their place."
    />
  );
}

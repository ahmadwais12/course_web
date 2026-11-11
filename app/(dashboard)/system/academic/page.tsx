'use client';

import SettingsForm, { type SettingField } from '@/components/system/SettingsForm';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const FIELDS: SettingField[] = [
  {
    key: 'gradingScale',
    label: 'Grading scale',
    type: 'select',
    options: [
      { value: 'percentage', label: 'Percentage (0–100)' },
      { value: 'letter', label: 'Letter grades (A–F)' },
      { value: 'gpa', label: 'GPA (0–4)' },
    ],
  },
  { key: 'passingMark', label: 'Default passing mark (%)', type: 'number' },
  { key: 'attendanceThreshold', label: 'Minimum attendance (%)', type: 'number', hint: 'Students below this are flagged' },
  { key: 'maxClassSize', label: 'Maximum class size', type: 'number' },
  { key: 'examWeight', label: 'Exam weight (%)', type: 'number', hint: 'Share of the final grade from exams' },
  {
    key: 'academicYearStart',
    label: 'Academic year starts',
    type: 'select',
    options: MONTHS.map((month) => ({ value: month, label: month })),
  },
  {
    key: 'autoEnroll',
    label: 'Auto-enroll admitted students',
    type: 'toggle',
    hint: 'Create an enrollment record when an application is admitted',
  },
  {
    key: 'allowRetakes',
    label: 'Allow exam retakes',
    type: 'toggle',
    hint: 'Students can retake a failed exam',
  },
];

const DEFAULTS = {
  gradingScale: 'percentage',
  passingMark: '50',
  attendanceThreshold: '75',
  maxClassSize: '30',
  examWeight: '100',
  academicYearStart: 'January',
  autoEnroll: false,
  allowRetakes: true,
};

export default function AcademicSettingsPage() {
  return (
    <SettingsForm
      scope="academic"
      title="Academic Settings"
      description="Grading scale, passing marks, attendance thresholds, and enrollment rules."
      sectionTitle="Academic rules"
      sectionDescription="Defaults used by exams, grades, attendance, and class management."
      fields={FIELDS}
      defaults={DEFAULTS}
    />
  );
}

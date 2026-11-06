import { SYSTEM_ROLES } from '@/lib/roles';

/** Values match the `announcements.audience` CHECK constraint. */
export type Audience = 'all' | 'students' | 'parents' | 'teachers' | 'staff';

const STAFF_ROLE_IDS = SYSTEM_ROLES.map((r) => r.id as string).filter(
  (id) => id !== 'student' && id !== 'guardian'
);

export const AUDIENCES: { value: Audience; label: string; roles: string[] | null }[] = [
  { value: 'all', label: 'Everyone', roles: null },
  { value: 'students', label: 'Students', roles: ['student'] },
  { value: 'parents', label: 'Guardians', roles: ['guardian', 'parent'] },
  { value: 'teachers', label: 'Teachers', roles: ['teacher'] },
  { value: 'staff', label: 'Staff', roles: STAFF_ROLE_IDS },
];

export function audienceLabel(value: string | null | undefined) {
  return AUDIENCES.find((a) => a.value === value)?.label ?? (value || '—');
}

export function isAudience(value: unknown): value is Audience {
  return AUDIENCES.some((a) => a.value === value);
}

export const ANNOUNCEMENT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
] as const;

/** Values match the `announcements.type` CHECK constraint. */
export const ANNOUNCEMENT_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'notice', label: 'Notice' },
  { value: 'event', label: 'Event' },
  { value: 'news', label: 'News' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'achievement', label: 'Achievement' },
] as const;

export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
] as const;

/** Values match the `feedback.status` / `feedback.feedback_type` CHECK constraints. */
export const FEEDBACK_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'archived', label: 'Archived' },
] as const;

export const FEEDBACK_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'course', label: 'Course' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'facility', label: 'Facility' },
  { value: 'service', label: 'Service' },
] as const;

export type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  type: string;
  audience: string | null;
  priority: string;
  status: string;
  is_pinned: boolean;
  publish_date: string | null;
  expiry_date: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type MessageLogRow = {
  id: string;
  recipient: string;
  subject: string | null;
  message: string;
  status: string;
  sender_id: string | null;
  sender_name: string | null;
  sent_at: string | null;
  created_at: string | null;
};

export type FeedbackRow = {
  id: string;
  title: string | null;
  comment: string;
  feedback_type: string | null;
  rating: number | null;
  status: string;
  is_anonymous: boolean;
  user_id: string | null;
  from_name: string;
  response: string | null;
  responded_by_name: string | null;
  responded_at: string | null;
  created_at: string | null;
};

/** Split a pasted list of phones / emails on commas, semicolons, spaces, or new lines. */
export function splitRecipients(raw: string) {
  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((v) => v.trim())
        .filter(Boolean)
    ),
  ];
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

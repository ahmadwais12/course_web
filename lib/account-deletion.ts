export type DeletionStatus = 'pending' | 'rejected' | 'completed' | 'cancelled';
export type DeletionSource = 'web' | 'app' | 'admin';

export const DELETION_STATUSES: { value: DeletionStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Account deleted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const DELETION_SOURCES: { value: DeletionSource; label: string }[] = [
  { value: 'web', label: 'Website form' },
  { value: 'app', label: 'Mobile app' },
  { value: 'admin', label: 'Added by admin' },
];

export function deletionStatusLabel(status: string) {
  return DELETION_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function deletionSourceLabel(source: string) {
  return DELETION_SOURCES.find((s) => s.value === source)?.label ?? source;
}

/** Days the team has to finish a request; shown on the public page. */
export const DELETION_SLA_DAYS = 30;

export type DeletionRequestRow = {
  id: string;
  nid: number | null;
  tenant_id: string | null;
  user_id: string | null;
  full_name: string | null;
  email: string;
  phone: string | null;
  reason: string | null;
  source: DeletionSource;
  status: DeletionStatus;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};

export type DeletionRequestAdminRow = DeletionRequestRow & {
  account: {
    full_name: string | null;
    role: string | null;
    is_active: boolean | null;
    deleted_at: string | null;
  } | null;
  reviewer_name: string | null;
  tenant_name: string | null;
};

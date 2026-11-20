/** Shared vocabulary and helpers for the Asset Verification module. */

export const CAMPAIGN_TYPES = [
  { value: 'full_physical', label: 'Full physical audit' },
  { value: 'annual', label: 'Annual audit' },
  { value: 'quarterly', label: 'Quarterly audit' },
  { value: 'monthly', label: 'Monthly audit' },
  { value: 'spot_check', label: 'Spot check' },
  { value: 'custom', label: 'Custom audit' },
] as const;

export const CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export const CAMPAIGN_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const;

export const SESSION_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export const VERIFY_RESULTS = [
  { value: 'pending', label: 'Pending' },
  { value: 'found', label: 'Found' },
  { value: 'not_found', label: 'Not found' },
  { value: 'wrong_location', label: 'Wrong location' },
  { value: 'damaged', label: 'Found but damaged' },
  { value: 'inactive', label: 'Found but inactive' },
  { value: 'unable', label: 'Unable to verify' },
] as const;

export const PHYSICAL_CONDITIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'not_functional', label: 'Not functional' },
] as const;

export const VERIFY_METHODS = [
  { value: 'manual', label: 'Manual inspection' },
  { value: 'qr_scan', label: 'QR scan' },
  { value: 'barcode_scan', label: 'Barcode scan' },
] as const;

export const DISCREPANCY_TYPES = [
  { value: 'not_found', label: 'Asset not found' },
  { value: 'wrong_location', label: 'Wrong location' },
  { value: 'wrong_branch', label: 'Wrong branch' },
  { value: 'wrong_department', label: 'Wrong department' },
  { value: 'damaged', label: 'Damaged asset' },
  { value: 'serial_mismatch', label: 'Serial number mismatch' },
  { value: 'missing_label', label: 'Missing asset label' },
  { value: 'duplicate', label: 'Duplicate asset' },
  { value: 'unregistered', label: 'Unregistered asset' },
  { value: 'incorrect_info', label: 'Incorrect asset information' },
  { value: 'other', label: 'Other' },
] as const;

export const DISCREPANCY_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'under_investigation', label: 'Under investigation' },
  { value: 'awaiting_approval', label: 'Awaiting approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
] as const;

export const DISCOVERY_STATUSES = [
  { value: 'discovered', label: 'Discovered' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'registered', label: 'Registered' },
] as const;

export const SCOPE_TYPES = [
  { value: 'all', label: 'All assets' },
  { value: 'departments', label: 'Specific departments' },
  { value: 'locations', label: 'Specific locations' },
  { value: 'categories', label: 'Specific asset categories' },
] as const;

export type CampaignType = (typeof CAMPAIGN_TYPES)[number]['value'];
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]['value'];
export type CampaignPriority = (typeof CAMPAIGN_PRIORITIES)[number]['value'];
export type SessionStatus = (typeof SESSION_STATUSES)[number]['value'];
export type VerifyResult = (typeof VERIFY_RESULTS)[number]['value'];
export type PhysicalCondition = (typeof PHYSICAL_CONDITIONS)[number]['value'];
export type VerifyMethod = (typeof VERIFY_METHODS)[number]['value'];
export type DiscrepancyType = (typeof DISCREPANCY_TYPES)[number]['value'];
export type DiscrepancyStatus = (typeof DISCREPANCY_STATUSES)[number]['value'];
export type DiscoveryStatus = (typeof DISCOVERY_STATUSES)[number]['value'];
export type ScopeType = (typeof SCOPE_TYPES)[number]['value'];

export function labelFrom<T extends readonly { value: string; label: string }[]>(
  options: T,
  value: string,
  fallback = '—'
) {
  return options.find((item) => item.value === value)?.label ?? (value || fallback);
}

export function optionsFrom<T extends readonly { value: string; label: string }[]>(options: T) {
  return options.map((item) => ({ value: item.value, label: item.label }));
}

export function isVerifyResult(value: string): value is VerifyResult {
  return VERIFY_RESULTS.some((item) => item.value === value);
}

export function isCampaignType(value: string): value is CampaignType {
  return CAMPAIGN_TYPES.some((item) => item.value === value);
}

export function isCampaignStatus(value: string): value is CampaignStatus {
  return CAMPAIGN_STATUSES.some((item) => item.value === value);
}

export function isSessionStatus(value: string): value is SessionStatus {
  return SESSION_STATUSES.some((item) => item.value === value);
}

export function isDiscrepancyType(value: string): value is DiscrepancyType {
  return DISCREPANCY_TYPES.some((item) => item.value === value);
}

export function isDiscrepancyStatus(value: string): value is DiscrepancyStatus {
  return DISCREPANCY_STATUSES.some((item) => item.value === value);
}

export function isPriority(value: string): value is CampaignPriority {
  return CAMPAIGN_PRIORITIES.some((item) => item.value === value);
}

export function isScopeType(value: string): value is ScopeType {
  return SCOPE_TYPES.some((item) => item.value === value);
}

export function discrepancyTypeForResult(result: VerifyResult): DiscrepancyType | null {
  if (result === 'not_found') return 'not_found';
  if (result === 'wrong_location') return 'wrong_location';
  if (result === 'damaged') return 'damaged';
  if (result === 'inactive') return 'incorrect_info';
  if (result === 'unable') return 'other';
  return null;
}

export function progress(verified: number, total: number) {
  if (!total) return 0;
  return Math.round((verified / total) * 100);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export type VerificationSettingsShape = {
  require_evidence_for_discrepancy: boolean;
  allow_submit_with_pending: boolean;
  auto_start_session: boolean;
  default_due_days: number;
  default_priority: CampaignPriority;
  notify_on_submit: boolean;
};

export const DEFAULT_VERIFICATION_SETTINGS: VerificationSettingsShape = {
  require_evidence_for_discrepancy: false,
  allow_submit_with_pending: false,
  auto_start_session: true,
  default_due_days: 14,
  default_priority: 'normal',
  notify_on_submit: true,
};

/** AI error codes with user-safe messages. Internal details are logged, never returned. */

export const AI_ERROR_MESSAGES = {
  unauthorized: 'Please sign in to use the AI Assistant.',
  forbidden: 'You do not have permission to perform this action.',
  account_inactive: 'Your account is inactive. Contact your administrator.',
  no_organization: 'Your account is not linked to an organization yet. Contact your administrator.',
  subscription_inactive:
    'Your organization subscription is inactive, so the AI Assistant is unavailable. Contact your administrator to renew.',
  ai_disabled: 'The AI Assistant is currently turned off by the platform administrator.',
  ai_disabled_for_org: 'The AI Assistant is not enabled for your organization. Contact your administrator.',
  role_not_allowed: 'Your role is not allowed to use the AI Assistant in this organization.',
  provider_not_configured: 'The AI Assistant is not configured yet. Please contact the platform administrator.',
  ai_tables_missing: 'The AI Assistant database has not been installed yet. Please contact the platform administrator.',
  invalid_input: 'The request is invalid.',
  message_empty: 'Please type a question.',
  message_too_long: 'Your message is too long. Please shorten it and try again.',
  conversation_not_found: 'Conversation not found.',
  not_found: 'Not found.',
  daily_quota_exceeded:
    'Your organization has used all AI messages for today. The limit resets tomorrow, or an administrator can upgrade your plan.',
  monthly_quota_exceeded:
    'Your organization has used all AI messages for this month. The limit resets next month, or an administrator can upgrade your plan.',
  rate_limited: 'You are sending messages too quickly. Please wait a moment and try again.',
  request_in_progress: 'This message is still being processed. Please wait a moment.',
  provider_unavailable: 'The AI service is temporarily unavailable. Please try again shortly.',
  provider_auth: 'The AI service is not configured correctly. Please contact the platform administrator.',
  provider_rate_limited: 'The AI service is busy right now. Please try again in a minute.',
  provider_timeout: 'The AI service took too long to respond. Please try again.',
  invalid_response: 'The AI service returned an unusable answer. Please try again.',
  knowledge_failed: 'The document could not be processed.',
  internal: 'Something went wrong. Please try again.',
} as const;

export type AIErrorCode = keyof typeof AI_ERROR_MESSAGES;

const STATUS: Partial<Record<AIErrorCode, number>> = {
  unauthorized: 401,
  forbidden: 403,
  account_inactive: 403,
  no_organization: 403,
  subscription_inactive: 403,
  ai_disabled: 503,
  ai_disabled_for_org: 403,
  role_not_allowed: 403,
  provider_not_configured: 503,
  ai_tables_missing: 503,
  invalid_input: 400,
  message_empty: 400,
  message_too_long: 400,
  conversation_not_found: 404,
  not_found: 404,
  daily_quota_exceeded: 429,
  monthly_quota_exceeded: 429,
  rate_limited: 429,
  request_in_progress: 409,
  provider_unavailable: 503,
  provider_auth: 502,
  provider_rate_limited: 429,
  provider_timeout: 504,
  invalid_response: 502,
  knowledge_failed: 422,
  internal: 500,
};

export class AIError extends Error {
  code: AIErrorCode;
  status: number;
  detail?: string;
  constructor(code: AIErrorCode, detail?: string) {
    super(AI_ERROR_MESSAGES[code]);
    this.code = code;
    this.status = STATUS[code] ?? 500;
    this.detail = detail;
  }
}

/** Postgres "relation does not exist" / PostgREST schema-cache misses for the AI tables. */
export function isMissingTableError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.code === 'PGRST202' ||
    /schema cache|does not exist|Could not find the (table|function)/i.test(error.message ?? '')
  );
}

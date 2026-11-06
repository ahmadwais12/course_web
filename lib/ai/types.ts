import type { AIModule } from '@/lib/ai/modules';

/** Authenticated context resolved on the server. Never built from request input. */
export type AIRequestContext = {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: string;
  abilities: string[];
  /** The user's own tenant (central organization or branch). */
  tenantId: string | null;
  /** Billing organization (central tenant). Equals tenantId for central/standalone tenants. */
  organizationId: string | null;
  organizationName: string | null;
  planSlug: string | null;
  /** Tenant ids whose data this user may read. `null` only for platform-scope users. */
  tenantScope: string[] | null;
  tenantNames: Record<string, string>;
  isPlatformScope: boolean;
  scopeLabel: string;
  subscriptionActive: boolean;
  currency: string;
  allowedModules: AIModule[];
  /** Lazily resolved by academic tools for teachers. */
  teacherClassIds?: string[];
};

export type AIChartSpec = {
  type: 'bar' | 'line' | 'pie';
  title: string;
  /** Each point: { label, [seriesKey]: number } */
  data: Record<string, string | number>[];
  series: { key: string; label: string }[];
  valueFormat?: 'number' | 'currency' | 'percent';
  currency?: string;
};

export type AILink = { label: string; href: string };

export type AISource = { index: number; title: string; module?: string | null; scope: 'platform' | 'organization' };

export type ToolResult = {
  /** Structured, already-aggregated data returned to the model. */
  data: Record<string, unknown>;
  scope: Record<string, unknown>;
  chart?: AIChartSpec;
  links?: AILink[];
  notes?: string[];
};

export type AIMessageMetadata = {
  language?: string;
  intent?: string;
  module?: string | null;
  tools?: string[];
  sources?: AISource[];
  links?: AILink[];
  charts?: AIChartSpec[];
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  request_id?: string;
};

export type AIMessageRow = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  response_metadata: AIMessageMetadata | null;
  feedback: number | null;
  created_at: string;
};

export type AIConversationRow = {
  id: string;
  title: string;
  context_type: string | null;
  context_reference: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

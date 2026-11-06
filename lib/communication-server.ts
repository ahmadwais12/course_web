import type { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  ANNOUNCEMENT_STATUSES,
  ANNOUNCEMENT_TYPES,
  AUDIENCES,
  PRIORITIES,
  isAudience,
  type AnnouncementRow,
  type Audience,
  type FeedbackRow,
} from '@/lib/communication';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export const ANNOUNCEMENT_SELECT =
  'id, title, content, type, audience, priority, status, is_pinned, publish_date, expiry_date, created_by, created_at, updated_at';

export function toAnnouncementRow(
  row: Record<string, unknown>,
  names: Map<string, string>
): AnnouncementRow {
  const createdBy = row.created_by ? String(row.created_by) : null;
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    type: String(row.type ?? 'general'),
    audience: row.audience ? String(row.audience) : null,
    priority: String(row.priority ?? 'normal'),
    status: String(row.status ?? 'draft'),
    is_pinned: Boolean(row.is_pinned),
    publish_date: row.publish_date ? String(row.publish_date) : null,
    expiry_date: row.expiry_date ? String(row.expiry_date) : null,
    created_by: createdBy,
    created_by_name: createdBy ? names.get(createdBy) ?? null : null,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

/** Validate an announcement body into a table payload, or return an error message. */
export function parseAnnouncement(body: Record<string, unknown>) {
  const title = String(body.title ?? '').trim();
  const content = String(body.content ?? '').trim();
  if (!title || !content) return { error: 'Title and message are required' } as const;

  const pick = (list: readonly { value: string }[], value: unknown, fallback: string) =>
    list.some((o) => o.value === value) ? String(value) : fallback;
  const dateOrNull = (v: unknown) => {
    const s = String(v ?? '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  };
  const audience: Audience = isAudience(body.audience) ? body.audience : 'all';

  return {
    payload: {
      title,
      content,
      type: pick(ANNOUNCEMENT_TYPES, body.type, 'general'),
      audience,
      target_audience: [audience],
      priority: pick(PRIORITIES, body.priority, 'normal'),
      status: pick(ANNOUNCEMENT_STATUSES, body.status, 'draft'),
      is_pinned: Boolean(body.is_pinned),
      publish_date: dateOrNull(body.publish_date),
      expiry_date: dateOrNull(body.expiry_date),
    },
  } as const;
}

/** In-app notification to everyone in the announcement's audience. Returns the count sent. */
export async function notifyAnnouncement(
  admin: AdminClient,
  row: Pick<AnnouncementRow, 'id' | 'title' | 'content' | 'audience' | 'priority'>,
  tenantId: string | null
) {
  const audience: Audience = isAudience(row.audience) ? row.audience : 'all';
  const recipients = await audienceRecipients(admin, audience, tenantId);
  return notifyUsers(
    admin,
    recipients.map((r) => r.id),
    {
      title: row.title,
      message: row.content.length > 280 ? `${row.content.slice(0, 277)}…` : row.content,
      tenantId,
      type: 'announcement',
      priority: row.priority,
      actionUrl: '/communication/announcements',
      data: { announcement_id: row.id },
    }
  );
}

export type Recipient = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

/** Active users in an audience, scoped to the actor's tenant when they have one. */
export async function audienceRecipients(
  admin: AdminClient,
  audience: Audience,
  tenantId: string | null
): Promise<Recipient[]> {
  const roles = AUDIENCES.find((a) => a.value === audience)?.roles ?? null;

  let query = admin
    .from('users')
    .select('id, full_name, email, phone')
    .is('deleted_at', null)
    .not('is_active', 'is', false)
    .limit(5000);
  if (roles) query = query.in('role', roles);
  if (tenantId) query = query.eq('tenant_id', tenantId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Recipient[];
}

export type Channel = 'sms' | 'email';

const CHANNEL = {
  sms: { table: 'sms_logs', recipientColumn: 'recipient_phone' },
  email: { table: 'email_logs', recipientColumn: 'recipient_email' },
} as const;

const NO_GATEWAY_NOTE = 'No gateway connected — saved as pending. Connect a provider in System → Integrations.';

export function normalizePhone(value: string) {
  const cleaned = value.replace(/[\s\-().]/g, '');
  return /^\+?\d{7,15}$/.test(cleaned) ? cleaned : null;
}

export function normalizeEmail(value: string) {
  const v = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

/** SMS / email history for the Communication pages. */
export async function listMessageLogs(admin: AdminClient, channel: Channel, tenantId: string | null) {
  const { table, recipientColumn } = CHANNEL[channel];
  const columns =
    channel === 'email'
      ? `id, ${recipientColumn}, subject, body, status, sender_id, sent_at, created_at`
      : `id, ${recipientColumn}, message, status, sender_id, sent_at, created_at`;

  let query = admin.from(table).select(columns).order('created_at', { ascending: false }).limit(1000);
  if (tenantId) query = query.eq('tenant_id', tenantId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const names = await userNames(
    admin,
    rows.map((r) => r.sender_id as string | null)
  );

  return rows.map((r) => {
    const senderId = r.sender_id ? String(r.sender_id) : null;
    return {
      id: String(r.id),
      recipient: String(r[recipientColumn] ?? ''),
      subject: channel === 'email' && r.subject ? String(r.subject) : null,
      message: String((channel === 'email' ? r.body : r.message) ?? ''),
      status: String(r.status ?? 'pending'),
      sender_id: senderId,
      sender_name: senderId ? names.get(senderId) ?? null : null,
      sent_at: r.sent_at ? String(r.sent_at) : null,
      created_at: r.created_at ? String(r.created_at) : null,
    };
  });
}

/**
 * Resolve recipients (typed list + optional audience), then record one log row each.
 * Rows are stored as `pending` because no SMS / email provider is connected yet.
 */
export async function queueMessages(
  admin: AdminClient,
  channel: Channel,
  input: {
    senderId: string;
    tenantId: string | null;
    recipients: string[];
    audience: Audience | null;
    message: string;
    subject?: string | null;
  }
) {
  const normalize = channel === 'sms' ? normalizePhone : normalizeEmail;
  const invalid: string[] = [];
  const targets = new Set<string>();

  for (const raw of input.recipients) {
    const value = normalize(raw);
    if (value) targets.add(value);
    else invalid.push(raw);
  }

  let skippedNoContact = 0;
  if (input.audience) {
    for (const user of await audienceRecipients(admin, input.audience, input.tenantId)) {
      const value = normalize(String((channel === 'sms' ? user.phone : user.email) ?? ''));
      if (value) targets.add(value);
      else skippedNoContact += 1;
    }
  }

  if (invalid.length) {
    return { error: `Invalid ${channel === 'sms' ? 'phone numbers' : 'email addresses'}: ${invalid.slice(0, 5).join(', ')}` } as const;
  }
  if (!targets.size) {
    return { error: 'No recipients with a valid contact were found' } as const;
  }
  if (targets.size > 2000) {
    return { error: 'Too many recipients in one send (max 2000)' } as const;
  }

  const { table, recipientColumn } = CHANNEL[channel];
  const now = new Date().toISOString();
  const rows = [...targets].map((recipient) => ({
    tenant_id: input.tenantId,
    sender_id: input.senderId,
    [recipientColumn]: recipient,
    ...(channel === 'email' ? { subject: input.subject ?? null, body: input.message } : { message: input.message }),
    status: 'pending',
    provider_response: { note: NO_GATEWAY_NOTE },
    sent_at: now,
  }));

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from(table).insert(rows.slice(i, i + 500));
    if (error) return { error: error.message } as const;
  }
  return { queued: rows.length, skippedNoContact } as const;
}

export const FEEDBACK_SELECT =
  'id, user_id, feedback_type, rating, title, comment, is_anonymous, status, response, responded_by, responded_at, created_at';

export function toFeedbackRow(row: Record<string, unknown>, names: Map<string, string>): FeedbackRow {
  const userId = row.user_id ? String(row.user_id) : null;
  const anonymous = Boolean(row.is_anonymous);
  const respondedBy = row.responded_by ? String(row.responded_by) : null;
  const rating = Number(row.rating);
  return {
    id: String(row.id),
    title: row.title ? String(row.title) : null,
    comment: String(row.comment ?? ''),
    feedback_type: row.feedback_type ? String(row.feedback_type) : null,
    rating: Number.isFinite(rating) && rating > 0 ? rating : null,
    status: String(row.status ?? 'pending'),
    is_anonymous: anonymous,
    user_id: anonymous ? null : userId,
    from_name: anonymous ? 'Anonymous' : (userId && names.get(userId)) || 'Unknown',
    response: row.response ? String(row.response) : null,
    responded_by_name: respondedBy ? names.get(respondedBy) ?? null : null,
    responded_at: row.responded_at ? String(row.responded_at) : null,
    created_at: row.created_at ? String(row.created_at) : null,
  };
}

/** Map user ids → display names for joining sender / author columns. */
export async function userNames(admin: AdminClient, ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  const names = new Map<string, string>();
  if (!unique.length) return names;
  const { data } = await admin.from('users').select('id, full_name, email').in('id', unique);
  for (const u of data ?? []) {
    names.set(String(u.id), String(u.full_name || u.email || 'User'));
  }
  return names;
}

/** Insert one in-app notification per user. Returns how many were created. */
export async function notifyUsers(
  admin: AdminClient,
  userIds: string[],
  input: {
    title: string;
    message: string;
    tenantId: string | null;
    type?: string;
    priority?: string;
    actionUrl?: string | null;
    data?: Record<string, unknown>;
  }
) {
  const unique = [...new Set(userIds)];
  let created = 0;
  for (let i = 0; i < unique.length; i += 500) {
    const rows = unique.slice(i, i + 500).map((userId) => ({
      user_id: userId,
      tenant_id: input.tenantId,
      title: input.title,
      body: input.message,
      type: input.type || 'general',
      priority: input.priority || 'normal',
      action_url: input.actionUrl ?? null,
      data: input.data ?? {},
      is_read: false,
    }));
    const { error } = await admin.from('notifications').insert(rows);
    if (error) throw new Error(error.message);
    created += rows.length;
  }
  return created;
}

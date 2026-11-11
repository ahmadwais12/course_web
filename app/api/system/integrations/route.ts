import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { str } from '@/lib/portal-api';

type ApiKeyRow = {
  id: string;
  name: string;
  key_value: string;
  is_active: boolean | null;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string | null;
};

type WebhookRow = {
  id: string;
  name: string;
  url: string;
  events: unknown;
  is_active: boolean | null;
  last_triggered_at: string | null;
  failure_count: number | null;
};

const WEBHOOK_EVENTS = new Set([
  'student.created',
  'student.updated',
  'payment.received',
  'invoice.created',
  'attendance.marked',
  'leave.submitted',
  'exam.graded',
  'staff.created',
]);

function maskKey(value: string) {
  if (value.length <= 10) return '••••••';
  return `${value.slice(0, 6)}••••••${value.slice(-4)}`;
}

function normalizeEvents(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const keysQuery = admin
      .from('api_keys')
      .select('id, name, key_value, is_active, expires_at, last_used_at, created_at')
      .order('created_at', { ascending: false });
    const hooksQuery = admin
      .from('webhooks')
      .select('id, name, url, events, is_active, last_triggered_at, failure_count')
      .order('created_at', { ascending: false });
    const [{ data: keyData, error }, { data: hookData }] = await Promise.all([
      tenantId ? keysQuery.eq('tenant_id', tenantId) : keysQuery,
      tenantId ? hooksQuery.eq('tenant_id', tenantId) : hooksQuery,
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      apiKeys: ((keyData ?? []) as ApiKeyRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        maskedKey: maskKey(row.key_value),
        isActive: row.is_active !== false,
        expiresAt: row.expires_at,
        lastUsedAt: row.last_used_at,
        createdAt: row.created_at,
      })),
      webhooks: ((hookData ?? []) as WebhookRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        url: row.url,
        events: normalizeEvents(row.events),
        isActive: row.is_active !== false,
        lastTriggeredAt: row.last_triggered_at,
        failureCount: row.failure_count ?? 0,
      })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load integrations');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId, userId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const kind = String(body.kind ?? '');
    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    const now = new Date().toISOString();

    if (kind === 'apiKey') {
      const expires = String(body.expiresAt ?? '').slice(0, 10);
      const key = `df_${randomBytes(24).toString('hex')}`;
      const { data, error } = await admin
        .from('api_keys')
        .insert({
          tenant_id: tenantId,
          name,
          key_value: key,
          permissions: {},
          is_active: true,
          expires_at: /^\d{4}-\d{2}-\d{2}$/.test(expires) ? `${expires}T23:59:59Z` : null,
          created_by: userId,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(
        { ok: true, id: (data as { id: string } | null)?.id ?? null, key },
        { status: 201 }
      );
    }

    if (kind === 'webhook') {
      const url = String(body.url ?? '').trim();
      const events = Array.isArray(body.events)
        ? body.events.map((item) => String(item)).filter((item) => WEBHOOK_EVENTS.has(item))
        : [];
      if (!/^https?:\/\//i.test(url)) {
        return NextResponse.json({ error: 'Webhook URL must start with http:// or https://' }, { status: 400 });
      }
      if (events.length === 0) {
        return NextResponse.json({ error: 'Choose at least one event' }, { status: 400 });
      }
      const { data, error } = await admin
        .from('webhooks')
        .insert({
          tenant_id: tenantId,
          name,
          url,
          events,
          secret: str(body.secret) ?? randomBytes(16).toString('hex'),
          is_active: true,
          failure_count: 0,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id ?? null }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unknown integration type' }, { status: 400 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to create integration');
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const id = str(body.id);
    const table = body.table === 'webhook' ? 'webhooks' : 'api_keys';
    if (!id) return NextResponse.json({ error: 'Integration id is required' }, { status: 400 });
    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive is required' }, { status: 400 });
    }

    const update = admin
      .from(table)
      .update({ is_active: body.isActive, updated_at: new Date().toISOString() })
      .eq('id', id);
    const { error } = await (tenantId ? update.eq('tenant_id', tenantId) : update);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update integration');
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const params = new URL(request.url).searchParams;
    const id = params.get('id');
    const table = params.get('table') === 'webhook' ? 'webhooks' : 'api_keys';
    if (!id) return NextResponse.json({ error: 'Integration id is required' }, { status: 400 });

    const remove = admin.from(table).delete().eq('id', id);
    const { error } = await (tenantId ? remove.eq('tenant_id', tenantId) : remove);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to delete integration');
  }
}

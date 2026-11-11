import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';

type TenantRow = {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  settings: Record<string, unknown> | null;
};

type NotificationSettingsRow = {
  email_notifications: boolean | null;
  push_notifications: boolean | null;
  sms_notifications: boolean | null;
  in_app_notifications: boolean | null;
  chat_notifications: boolean | null;
  academic_notifications: boolean | null;
  payment_notifications: boolean | null;
  attendance_notifications: boolean | null;
  hr_notifications: boolean | null;
  system_notifications: boolean | null;
  marketing_notifications: boolean | null;
};

const SETTINGS_SCOPES = new Set(['finance', 'academic', 'localization', 'languages']);

const GENERAL_FIELDS: Record<string, string> = {
  name: 'name',
  tagline: 'tagline',
  description: 'description',
  email: 'email',
  phone: 'phone',
  website: 'website',
  address: 'address',
  city: 'city',
  country: 'country',
};

const NOTIFICATION_FIELDS: Record<string, keyof NotificationSettingsRow> = {
  email: 'email_notifications',
  push: 'push_notifications',
  sms: 'sms_notifications',
  inApp: 'in_app_notifications',
  chat: 'chat_notifications',
  academic: 'academic_notifications',
  payment: 'payment_notifications',
  attendance: 'attendance_notifications',
  hr: 'hr_notifications',
  system: 'system_notifications',
  marketing: 'marketing_notifications',
};

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, userId, tenantId } = auth.session;

    const tenantQuery = admin
      .from('tenants')
      .select(
        'id, name, tagline, description, email, phone, website, address, city, country, settings'
      );
    const { data: tenantData, error } = tenantId
      ? await tenantQuery.eq('id', tenantId).maybeSingle()
      : await tenantQuery.order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!tenantData) {
      return NextResponse.json({ error: 'No tenant is linked to this account' }, { status: 404 });
    }

    const tenant = tenantData as TenantRow;
    const settings = (tenant.settings ?? {}) as Record<string, unknown>;

    const { data: notificationData } = await admin
      .from('notification_settings')
      .select(
        'email_notifications, push_notifications, sms_notifications, in_app_notifications, chat_notifications, academic_notifications, payment_notifications, attendance_notifications, hr_notifications, system_notifications, marketing_notifications'
      )
      .eq('user_id', userId)
      .maybeSingle();
    const notifications = (notificationData ?? {}) as NotificationSettingsRow;

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        tagline: tenant.tagline,
        description: tenant.description,
        email: tenant.email,
        phone: tenant.phone,
        website: tenant.website,
        address: tenant.address,
        city: tenant.city,
        country: tenant.country,
      },
      settings: {
        general: {
          name: tenant.name ?? '',
          tagline: tenant.tagline ?? '',
          description: tenant.description ?? '',
          email: tenant.email ?? '',
          phone: tenant.phone ?? '',
          website: tenant.website ?? '',
          address: tenant.address ?? '',
          city: tenant.city ?? '',
          country: tenant.country ?? '',
        },
        finance: (settings.finance as Record<string, unknown>) ?? {},
        academic: (settings.academic as Record<string, unknown>) ?? {},
        localization: (settings.localization as Record<string, unknown>) ?? {},
        languages: (settings.languages as Record<string, unknown>) ?? {},
      },
      notifications: {
        email: notifications.email_notifications !== false,
        push: notifications.push_notifications !== false,
        sms: notifications.sms_notifications === true,
        inApp: notifications.in_app_notifications !== false,
        chat: notifications.chat_notifications !== false,
        academic: notifications.academic_notifications !== false,
        payment: notifications.payment_notifications !== false,
        attendance: notifications.attendance_notifications !== false,
        hr: notifications.hr_notifications !== false,
        system: notifications.system_notifications !== false,
        marketing: notifications.marketing_notifications === true,
      },
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load system settings');
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, userId, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const scope = String(body.scope ?? '');
    const values = (body.values ?? {}) as Record<string, unknown>;
    if (!scope) return NextResponse.json({ error: 'Settings scope is required' }, { status: 400 });

    const allowed = scope === 'general' || scope === 'notifications' || SETTINGS_SCOPES.has(scope);
    if (!allowed) return NextResponse.json({ error: 'Unknown settings scope' }, { status: 400 });

    if (scope === 'notifications') {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const [key, column] of Object.entries(NOTIFICATION_FIELDS)) {
        if (typeof values[key] === 'boolean') patch[column] = values[key];
      }
      const { error } = await admin.from('notification_settings').upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          ...patch,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const tenantQuery = admin.from('tenants').select('id, settings');
    const { data: tenantData, error: tenantError } = tenantId
      ? await tenantQuery.eq('id', tenantId).maybeSingle()
      : await tenantQuery.limit(1).maybeSingle();
    if (tenantError) return NextResponse.json({ error: tenantError.message }, { status: 500 });
    const tenant = tenantData as { id: string; settings: Record<string, unknown> | null } | null;
    if (!tenant) return NextResponse.json({ error: 'No tenant is linked to this account' }, { status: 404 });

    const now = new Date().toISOString();

    if (scope === 'general') {
      const patch: Record<string, unknown> = { updated_at: now };
      for (const [key, column] of Object.entries(GENERAL_FIELDS)) {
        if (typeof values[key] === 'string') patch[column] = values[key].trim() || null;
      }
      if (typeof values.name === 'string' && !values.name.trim()) {
        return NextResponse.json({ error: 'Institute name is required' }, { status: 400 });
      }
      const { error } = await admin.from('tenants').update(patch).eq('id', tenant.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const current = (tenant.settings ?? {}) as Record<string, unknown>;
    const nextSettings = { ...current, [scope]: values };
    const { error } = await admin
      .from('tenants')
      .update({ settings: nextSettings, updated_at: now })
      .eq('id', tenant.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to save system settings');
  }
}

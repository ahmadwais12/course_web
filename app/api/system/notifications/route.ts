import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';

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

type TemplateRow = {
  id: string;
  name: string;
  type: string;
  category: string | null;
  subject: string | null;
  body: string;
  is_active: boolean | null;
  updated_at: string | null;
};

const FIELDS: Record<string, keyof NotificationSettingsRow> = {
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

    const templateQuery = admin
      .from('notification_templates')
      .select('id, name, type, category, subject, body, is_active, updated_at')
      .order('name', { ascending: true });
    const [{ data: settingsData }, { data: templateData, error }] = await Promise.all([
      admin
        .from('notification_settings')
        .select(
          'email_notifications, push_notifications, sms_notifications, in_app_notifications, chat_notifications, academic_notifications, payment_notifications, attendance_notifications, hr_notifications, system_notifications, marketing_notifications'
        )
        .eq('user_id', userId)
        .maybeSingle(),
      tenantId ? templateQuery.eq('tenant_id', tenantId) : templateQuery,
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const settings = (settingsData ?? {}) as NotificationSettingsRow;

    return NextResponse.json({
      settings: {
        email: settings.email_notifications !== false,
        push: settings.push_notifications !== false,
        sms: settings.sms_notifications === true,
        inApp: settings.in_app_notifications !== false,
        chat: settings.chat_notifications !== false,
        academic: settings.academic_notifications !== false,
        payment: settings.payment_notifications !== false,
        attendance: settings.attendance_notifications !== false,
        hr: settings.hr_notifications !== false,
        system: settings.system_notifications !== false,
        marketing: settings.marketing_notifications === true,
      },
      templates: ((templateData ?? []) as TemplateRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        category: row.category,
        subject: row.subject,
        body: row.body,
        isActive: row.is_active !== false,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load notification settings');
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, userId, tenantId } = auth.session;

    const body = (await request.json()) as { values?: Record<string, unknown> };
    const values = body.values ?? {};
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    for (const [key, column] of Object.entries(FIELDS)) {
      if (typeof values[key] === 'boolean') patch[column] = values[key];
    }

    const { error } = await admin
      .from('notification_settings')
      .upsert({ tenant_id: tenantId, user_id: userId, ...patch }, { onConflict: 'user_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to save notification settings');
  }
}

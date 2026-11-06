import type { createSupabaseAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type LoginEventType = 'login' | 'logout' | 'failed_login';

export type LoginHistoryRow = {
  id: string;
  nid?: number | null;
  tenant_id: string | null;
  user_id: string | null;
  email: string | null;
  event_type: LoginEventType;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  user_name?: string | null;
};

export type RecordLoginEventInput = {
  admin: AdminClient;
  eventType: LoginEventType;
  userId?: string | null;
  tenantId?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  location?: string | null;
  details?: Record<string, unknown> | null;
};

/** Lightweight UA parse — enough for the login-history table columns. */
export function parseUserAgent(ua: string | null | undefined) {
  const value = (ua || '').trim();
  if (!value) {
    return {
      deviceType: 'unknown' as const,
      deviceName: null as string | null,
      browser: null as string | null,
      os: null as string | null,
    };
  }

  const lower = value.toLowerCase();
  let deviceType: 'mobile' | 'tablet' | 'desktop' | 'web' = 'web';
  if (/ipad|tablet|kindle|silk/.test(lower)) deviceType = 'tablet';
  else if (/mobi|iphone|android.*mobile|opera mini|windows phone/.test(lower)) deviceType = 'mobile';
  else if (/windows|macintosh|linux|cros/.test(lower)) deviceType = 'desktop';

  let os: string | null = null;
  const android = value.match(/android ([\d.]+)/i);
  const ios = value.match(/iphone os ([\d_]+)/i);
  const ipados = value.match(/ipad; cpu os ([\d_]+)/i);
  const macos = value.match(/mac os x ([\d_]+)/i);
  if (/windows nt 10/i.test(value)) os = 'Windows 10+';
  else if (/windows/i.test(value)) os = 'Windows';
  else if (android) os = `Android ${android[1]}`;
  else if (ios) os = `iOS ${ios[1].replace(/_/g, '.')}`;
  else if (ipados) os = `iPadOS ${ipados[1].replace(/_/g, '.')}`;
  else if (macos) os = `macOS ${macos[1].replace(/_/g, '.')}`;
  else if (/cros/i.test(value)) os = 'Chrome OS';
  else if (/linux/i.test(value)) os = 'Linux';

  let browser: string | null = null;
  const edge = value.match(/edg\/([\d.]+)/i);
  const chrome = value.match(/chrome\/([\d.]+)/i);
  const firefox = value.match(/firefox\/([\d.]+)/i);
  const safari = value.match(/version\/([\d.]+).*safari/i);
  if (edge) browser = `Edge ${edge[1]}`;
  else if (chrome && !/edg\//i.test(value)) browser = `Chrome ${chrome[1]}`;
  else if (firefox) browser = `Firefox ${firefox[1]}`;
  else if (safari) browser = `Safari ${safari[1]}`;
  else if (/msie |trident\//i.test(value)) browser = 'Internet Explorer';

  const deviceName = [browser, os].filter(Boolean).join(' · ') || null;

  return { deviceType, deviceName, browser, os };
}

/** Best-effort login history write — never throws to callers. */
export async function recordLoginEvent(input: RecordLoginEventInput) {
  try {
    const parsed = parseUserAgent(input.userAgent);
    const success = input.eventType !== 'failed_login';
    const { error } = await input.admin.from('login_history').insert({
      tenant_id: input.tenantId ?? null,
      user_id: input.userId ?? null,
      email: input.email?.trim().toLowerCase() || null,
      event_type: input.eventType,
      success,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
      device_type: parsed.deviceType,
      device_name: parsed.deviceName,
      browser: parsed.browser,
      os: parsed.os,
      location: input.location ?? null,
      details: input.details ?? {},
    });
    if (error) console.error('[login-history]', error.message);
  } catch (e) {
    console.error('[login-history]', e);
  }
}

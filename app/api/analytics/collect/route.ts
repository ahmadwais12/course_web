import { NextResponse } from 'next/server';
import {
  classifyTraffic,
  detectBrowser,
  detectDeviceType,
  detectOs,
  isInternalPath,
  isLikelyBot,
  normalizeSurface,
} from '@/lib/analytics/classify';
import { createAnalyticsAdminClient } from '@/lib/analytics/auth';

export const runtime = 'nodejs';

type CollectBody = {
  anonymousId?: string;
  sessionId?: string;
  type?: 'pageview' | 'heartbeat' | 'event';
  path?: string;
  title?: string;
  referrer?: string;
  language?: string;
  screenWidth?: number;
  screenHeight?: number;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  eventName?: string;
  eventProps?: Record<string, unknown>;
  durationMs?: number;
  exclude?: boolean;
  surface?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ok() {
  return NextResponse.json({ ok: true });
}

type AnalyticsAdminClient = ReturnType<typeof createAnalyticsAdminClient>;

/**
 * Inserts a row including the `surface` column. If the column has not been
 * added yet (sql/analytics_schema.sql not re-run), it transparently retries
 * without it so collection keeps working.
 */
async function insertRow(
  admin: AnalyticsAdminClient,
  table: 'site_sessions' | 'site_page_views',
  row: Record<string, unknown>
) {
  const { error } = await admin.from(table).insert(row);
  if (!error) return;
  if ((error.message || '').toLowerCase().includes('surface')) {
    const { surface: _surface, ...legacyRow } = row;
    await admin.from(table).insert(legacyRow);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CollectBody;
    if (body.exclude) return ok();

    const anonymousId = String(body.anonymousId ?? '').trim();
    const sessionId = String(body.sessionId ?? '').trim();
    if (!UUID_RE.test(anonymousId) || !UUID_RE.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
    }

    const path = String(body.path ?? '/').slice(0, 500);
    const type = body.type ?? 'pageview';
    const surface = normalizeSurface(body.surface);
    const ua = request.headers.get('user-agent') || '';
    const bot = isLikelyBot(ua);
    // App traffic is never a public website page; keep it out of the public
    // "web" bucket as well as flagging the surface explicitly.
    const internal = surface === 'app' ? true : isInternalPath(path);
    const device = detectDeviceType(ua);
    const browser = detectBrowser(ua);
    const os = detectOs(ua);
    const country = request.headers.get('cf-ipcountry') || request.headers.get('x-vercel-ip-country') || null;

    let admin;
    try {
      admin = createAnalyticsAdminClient();
    } catch {
      // Analytics non-critical — swallow misconfig
      return ok();
    }

    const now = new Date().toISOString();

    // Upsert visitor
    const { data: existingVisitor } = await admin
      .from('site_visitors')
      .select('id, first_seen_at')
      .eq('anonymous_id', anonymousId)
      .maybeSingle();

    let visitorId = existingVisitor?.id as string | undefined;
    if (!visitorId) {
      const { data: created, error } = await admin
        .from('site_visitors')
        .insert({
          anonymous_id: anonymousId,
          first_seen_at: now,
          last_seen_at: now,
          is_returning: false,
        })
        .select('id')
        .single();
      if (error || !created) return ok();
      visitorId = created.id;
    } else {
      await admin
        .from('site_visitors')
        .update({ last_seen_at: now, is_returning: true })
        .eq('id', visitorId);
    }

    const { data: existingSession } = await admin
      .from('site_sessions')
      .select('id, page_count, started_at, source')
      .eq('id', sessionId)
      .maybeSingle();

    if (!existingSession) {
      const attr = classifyTraffic({
        referrer: body.referrer ?? null,
        utm_source: body.utm?.source,
        utm_medium: body.utm?.medium,
        utm_campaign: body.utm?.campaign,
        utm_term: body.utm?.term,
        utm_content: body.utm?.content,
      });

      await insertRow(admin, 'site_sessions', {
        id: sessionId,
        visitor_id: visitorId,
        started_at: now,
        last_activity_at: now,
        landing_path: path,
        exit_path: path,
        referrer: body.referrer?.slice(0, 1000) || null,
        source: attr.source,
        medium: attr.medium,
        campaign: attr.campaign,
        term: attr.term,
        content: attr.content,
        device_type: device,
        browser,
        os,
        language: body.language?.slice(0, 32) || null,
        screen_width: body.screenWidth || null,
        screen_height: body.screenHeight || null,
        country: country && country !== 'XX' ? country : null,
        is_bot: bot,
        is_internal: internal,
        surface,
        page_count: type === 'pageview' ? 1 : 0,
        duration_ms: 0,
      });
    } else {
      const started = new Date(existingSession.started_at as string).getTime();
      const duration = Math.max(0, Date.now() - started);
      const patch: Record<string, unknown> = {
        last_activity_at: now,
        exit_path: path,
        duration_ms: duration,
      };
      if (type === 'pageview') {
        patch.page_count = Number(existingSession.page_count || 0) + 1;
      }
      await admin.from('site_sessions').update(patch).eq('id', sessionId);
    }

    if (type === 'pageview') {
      await insertRow(admin, 'site_page_views', {
        session_id: sessionId,
        visitor_id: visitorId,
        path,
        title: body.title?.slice(0, 300) || null,
        referrer: body.referrer?.slice(0, 1000) || null,
        viewed_at: now,
        duration_ms: Math.max(0, Number(body.durationMs) || 0),
        device_type: device,
        browser,
        os,
        is_internal: internal,
        is_bot: bot,
        surface,
      });
    }

    if (type === 'event' && body.eventName) {
      await admin.from('site_events').insert({
        session_id: sessionId,
        visitor_id: visitorId,
        name: String(body.eventName).slice(0, 100),
        path,
        props: body.eventProps && typeof body.eventProps === 'object' ? body.eventProps : {},
      });
    }

    return ok();
  } catch {
    return ok();
  }
}

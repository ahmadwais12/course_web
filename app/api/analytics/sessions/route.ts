import { NextResponse } from 'next/server';
import { createAnalyticsAdminClient, requireAnalyticsAccess } from '@/lib/analytics/auth';

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  const x = startOfDay();
  x.setDate(x.getDate() - n);
  return x;
}

/** Paginated visitor sessions for the System Viewer visitors table. */
export async function GET(request: Request) {
  const access = await requireAnalyticsAccess();
  if ('error' in access && access.error) return access.error;

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30d';
  const surface = searchParams.get('surface') || 'all';
  const device = searchParams.get('device') || '';
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const perPage = Math.min(100, Math.max(10, Number(searchParams.get('perPage') || 20)));
  const includeBots = searchParams.get('bots') === '1';

  let from = daysAgo(29);
  if (range === 'today') from = startOfDay();
  else if (range === '7d') from = daysAgo(6);
  else if (range === '90d') from = daysAgo(89);
  else if (range === '12m') from = daysAgo(364);

  try {
    const admin = createAnalyticsAdminClient();

    let sessionsQ = admin
      .from('site_sessions')
      .select(
        'id, visitor_id, started_at, last_activity_at, duration_ms, page_count, device_type, browser, os, source, medium, landing_path, exit_path, country, language, screen_width, screen_height, is_bot, is_internal, surface, referrer'
      )
      .gte('started_at', from.toISOString())
      .order('last_activity_at', { ascending: false })
      .limit(5000);

    if (!includeBots) sessionsQ = sessionsQ.eq('is_bot', false);
    if (surface === 'web') sessionsQ = sessionsQ.eq('surface', 'web').eq('is_internal', false);
    if (surface === 'app') sessionsQ = sessionsQ.eq('surface', 'app');
    if (surface === 'desktop') sessionsQ = sessionsQ.eq('surface', 'desktop');
    // Optional browser form-factor filter (website only; not the desktop EXE surface)
    if (device && ['desktop', 'mobile', 'tablet', 'unknown'].includes(device)) {
      sessionsQ = sessionsQ.eq('device_type', device);
    }

    const { data, error } = await sessionsQ;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let rows = data ?? [];

    const visitorIds = [...new Set(rows.map((r) => r.visitor_id).filter(Boolean))];
    const visitorMap = new Map<
      string,
      { anonymous_id: string; first_seen_at: string | null; last_seen_at: string | null; is_returning: boolean | null }
    >();

    if (visitorIds.length) {
      const { data: visitors } = await admin
        .from('site_visitors')
        .select('id, anonymous_id, first_seen_at, last_seen_at, is_returning')
        .in('id', visitorIds.slice(0, 1000));
      for (const v of visitors ?? []) {
        visitorMap.set(v.id, {
          anonymous_id: v.anonymous_id,
          first_seen_at: v.first_seen_at,
          last_seen_at: v.last_seen_at,
          is_returning: v.is_returning,
        });
      }
    }

    if (q) {
      rows = rows.filter((r) => {
        const visitor = visitorMap.get(r.visitor_id);
        const hay = [
          r.landing_path,
          r.exit_path,
          r.device_type,
          r.browser,
          r.os,
          r.source,
          r.medium,
          r.country,
          r.referrer,
          visitor?.anonymous_id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    const devices = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
    const clients = { web: 0, app: 0, desktop: 0 };
    const visitors = new Set<string>();
    for (const r of rows) {
      visitors.add(r.visitor_id);
      const key = (r.device_type || 'unknown') as keyof typeof devices;
      if (key in devices) devices[key] += 1;
      else devices.unknown += 1;
      if (r.surface === 'app') clients.app += 1;
      else if (r.surface === 'desktop') clients.desktop += 1;
      else clients.web += 1;
    }

    const total = rows.length;
    const start = (page - 1) * perPage;
    const pageRows = rows.slice(start, start + perPage).map((r) => {
      const visitor = visitorMap.get(r.visitor_id);
      return {
        id: r.id,
        visitorId: r.visitor_id,
        anonymousId: visitor?.anonymous_id || null,
        isReturning: Boolean(visitor?.is_returning),
        firstSeenAt: visitor?.first_seen_at || null,
        lastSeenAt: visitor?.last_seen_at || null,
        startedAt: r.started_at,
        lastActivityAt: r.last_activity_at,
        durationMs: Number(r.duration_ms || 0),
        pageCount: Number(r.page_count || 0),
        device: r.device_type || 'unknown',
        browser: r.browser || null,
        os: r.os || null,
        source: r.source || null,
        medium: r.medium || null,
        landingPath: r.landing_path || null,
        exitPath: r.exit_path || null,
        country: r.country || null,
        language: r.language || null,
        screen: r.screen_width && r.screen_height ? `${r.screen_width}×${r.screen_height}` : null,
        surface: r.surface || 'web',
        referrer: r.referrer || null,
      };
    });

    return NextResponse.json({
      total,
      page,
      perPage,
      uniqueVisitors: visitors.size,
      devices,
      clients,
      rows: pageRows,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sessions unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

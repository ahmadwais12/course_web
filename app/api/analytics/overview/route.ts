import { NextResponse } from 'next/server';
import { createAnalyticsAdminClient, requireAnalyticsAccess } from '@/lib/analytics/auth';
import { sourceCategory } from '@/lib/analytics/classify';

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

export async function GET(request: Request) {
  const access = await requireAnalyticsAccess();
  if ('error' in access && access.error) return access.error;

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30d';
  const surface = searchParams.get('surface') || 'web'; // web | app | all
  const includeBots = searchParams.get('bots') === '1';

  let from = daysAgo(29);
  if (range === 'today') from = startOfDay();
  else if (range === '7d') from = daysAgo(6);
  else if (range === '90d') from = daysAgo(89);
  else if (range === '12m') from = daysAgo(364);

  const fromIso = from.toISOString();
  const todayIso = startOfDay().toISOString();
  const weekIso = daysAgo(6).toISOString();
  const monthIso = daysAgo(29).toISOString();

  try {
    const admin = createAnalyticsAdminClient();

    let sessionsQ = admin
      .from('site_sessions')
      .select(
        'id, visitor_id, started_at, last_activity_at, duration_ms, page_count, device_type, browser, os, source, medium, landing_path, exit_path, country, is_bot, is_internal, surface'
      )
      .gte('started_at', fromIso)
      .order('started_at', { ascending: true })
      .limit(20000);

    if (!includeBots) sessionsQ = sessionsQ.eq('is_bot', false);
    // 'web' = public website pages, 'app' = Flutter mobile apps.
    if (surface === 'web') sessionsQ = sessionsQ.eq('surface', 'web').eq('is_internal', false);
    if (surface === 'app') sessionsQ = sessionsQ.eq('surface', 'app');

    const { data: sessions, error } = await sessionsQ;
    if (error) {
      const needsSchema = /surface|column|does not exist/i.test(error.message);
      return NextResponse.json(
        {
          error: error.message,
          ...(needsSchema
            ? { hint: 'Re-run sql/analytics_schema.sql in Supabase to add the surface column' }
            : {}),
        },
        { status: 500 }
      );
    }

    const rows = sessions ?? [];
    const todayRows = rows.filter((s) => s.started_at >= todayIso);
    const weekRows = rows.filter((s) => s.started_at >= weekIso);
    const monthRows = rows.filter((s) => s.started_at >= monthIso);

    const uniq = (list: { visitor_id: string }[]) => new Set(list.map((s) => s.visitor_id)).size;
    const pageViews = (list: { page_count: number | null }[]) =>
      list.reduce((a, s) => a + Number(s.page_count || 0), 0);
    const avgDuration = (list: typeof rows) => {
      if (!list.length) return 0;
      return Math.round(list.reduce((a, s) => a + Number(s.duration_ms || 0), 0) / list.length);
    };
    const engaged = (list: typeof rows) =>
      list.filter((s) => Number(s.page_count || 0) > 1 || Number(s.duration_ms || 0) >= 10000).length;

    // Trend by day
    const trendMap = new Map<string, { visitors: Set<string>; sessions: number; pageViews: number }>();
    for (const s of rows) {
      const day = String(s.started_at).slice(0, 10);
      if (!trendMap.has(day)) trendMap.set(day, { visitors: new Set(), sessions: 0, pageViews: 0 });
      const t = trendMap.get(day)!;
      t.visitors.add(s.visitor_id);
      t.sessions += 1;
      t.pageViews += Number(s.page_count || 0);
    }
    const trend = [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({
        day,
        visitors: v.visitors.size,
        sessions: v.sessions,
        pageViews: v.pageViews,
      }));

    // Website vs mobile-app split (period, independent of the surface filter)
    const { data: audienceRows } = await admin
      .from('site_sessions')
      .select('visitor_id, is_internal, surface, device_type, page_count')
      .gte('started_at', fromIso)
      .eq('is_bot', false)
      .limit(50000);
    const audience = audienceRows ?? [];
    const surfaceBlock = (match: (s: (typeof audience)[number]) => boolean) => {
      const list = audience.filter(match);
      return {
        visitors: uniq(list),
        sessions: list.length,
        pageViews: pageViews(list),
      };
    };
    const surfaces = {
      web: surfaceBlock((s) => s.surface !== 'app' && !s.is_internal),
      app: surfaceBlock((s) => s.surface === 'app'),
    };

    // Devices — unique visitors in the selected period
    const deviceCount: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
    const deviceVisitors: Record<string, Set<string>> = {
      desktop: new Set(),
      mobile: new Set(),
      tablet: new Set(),
      unknown: new Set(),
    };
    for (const s of audience) {
      const d = (s.device_type || 'unknown') as string;
      (deviceVisitors[d] || deviceVisitors.unknown).add(s.visitor_id);
    }
    for (const key of Object.keys(deviceCount)) deviceCount[key] = deviceVisitors[key].size;

    // Sources
    const sourceMap = new Map<string, { visitors: Set<string>; sessions: number; pageViews: number }>();
    for (const s of monthRows.length ? monthRows : rows) {
      const cat = sourceCategory(s.medium, s.source);
      if (!sourceMap.has(cat)) sourceMap.set(cat, { visitors: new Set(), sessions: 0, pageViews: 0 });
      const g = sourceMap.get(cat)!;
      g.visitors.add(s.visitor_id);
      g.sessions += 1;
      g.pageViews += Number(s.page_count || 0);
    }
    const sources = [...sourceMap.entries()]
      .map(([name, v]) => ({
        name,
        visitors: v.visitors.size,
        sessions: v.sessions,
        pageViews: v.pageViews,
      }))
      .sort((a, b) => b.sessions - a.sessions);

    // Browsers / OS
    const countField = (field: 'browser' | 'os') => {
      const m = new Map<string, number>();
      for (const s of monthRows.length ? monthRows : rows) {
        const key = (s[field] as string) || 'Other';
        m.set(key, (m.get(key) || 0) + 1);
      }
      return [...m.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    };

    // Top landing pages
    const landingMap = new Map<string, number>();
    for (const s of monthRows.length ? monthRows : rows) {
      const p = s.landing_path || '/';
      landingMap.set(p, (landingMap.get(p) || 0) + 1);
    }
    const landings = [...landingMap.entries()]
      .map(([path, sessions]) => ({ path, sessions }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 15);

    // Countries
    const countryMap = new Map<string, number>();
    for (const s of monthRows.length ? monthRows : rows) {
      const c = s.country || 'Unknown';
      countryMap.set(c, (countryMap.get(c) || 0) + 1);
    }
    const countries = [...countryMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Page views detail from page_views table
    let pvQ = admin
      .from('site_page_views')
      .select('path, visitor_id, session_id, viewed_at, is_bot, is_internal')
      .gte('viewed_at', monthIso)
      .limit(20000);
    if (!includeBots) pvQ = pvQ.eq('is_bot', false);
    if (surface === 'web') pvQ = pvQ.eq('surface', 'web').eq('is_internal', false);
    if (surface === 'app') pvQ = pvQ.eq('surface', 'app');
    const { data: pageViewsRows } = await pvQ;

    const pageMap = new Map<
      string,
      { views: number; visitors: Set<string>; sessions: Set<string> }
    >();
    for (const pv of pageViewsRows ?? []) {
      const p = pv.path || '/';
      if (!pageMap.has(p)) pageMap.set(p, { views: 0, visitors: new Set(), sessions: new Set() });
      const g = pageMap.get(p)!;
      g.views += 1;
      g.visitors.add(pv.visitor_id);
      g.sessions.add(pv.session_id);
    }
    const topPages = [...pageMap.entries()]
      .map(([path, v]) => ({
        path,
        views: v.views,
        uniqueVisitors: v.visitors.size,
        sessions: v.sessions.size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    const organic = sources.find((s) => s.name === 'Organic Search');

    const metricBlock = (list: typeof rows) => ({
      visitors: uniq(list),
      sessions: list.length,
      pageViews: pageViews(list),
      avgSessionDurationMs: avgDuration(list),
      engagementRate: list.length ? Math.round((engaged(list) / list.length) * 100) : 0,
    });

    // All-time light counts
    let allQ = admin.from('site_sessions').select('id, visitor_id, page_count, is_bot, is_internal, surface');
    if (!includeBots) allQ = allQ.eq('is_bot', false);
    if (surface === 'web') allQ = allQ.eq('surface', 'web').eq('is_internal', false);
    if (surface === 'app') allQ = allQ.eq('surface', 'app');
    const { data: allSessions } = await allQ.limit(50000);
    const all = allSessions ?? [];

    return NextResponse.json({
      definitions: {
        visitor: 'Unique anonymous_id with at least one non-bot session in the period',
        session: 'Continuous activity window identified by session UUID (client-managed)',
        pageView: 'Single tracked navigation / load',
        activeUser: 'Session with last_activity within the last 5 minutes',
        engagementRate: 'Share of sessions with >1 page or ≥10s duration',
      },
      range,
      surface,
      today: metricBlock(todayRows),
      week: metricBlock(weekRows),
      month: metricBlock(monthRows),
      period: metricBlock(rows),
      allTime: {
        visitors: new Set(all.map((s) => s.visitor_id)).size,
        sessions: all.length,
        pageViews: all.reduce((a, s) => a + Number(s.page_count || 0), 0),
      },
      trend,
      surfaces,
      devices: deviceCount,
      sources,
      browsers: countField('browser'),
      operatingSystems: countField('os'),
      countries,
      landings,
      topPages,
      seo: {
        organicVisitors: organic?.visitors ?? 0,
        organicSessions: organic?.sessions ?? 0,
        organicPageViews: organic?.pageViews ?? 0,
        organicShare:
          monthRows.length && organic
            ? Math.round((organic.sessions / monthRows.length) * 100)
            : 0,
        note: 'Organic figures come from first-party referrer/UTM classification — not Google Search Console.',
      },
      geoNote:
        countries.some((c) => c.name !== 'Unknown')
          ? 'Country from CDN headers when available (e.g. Cloudflare/Vercel).'
          : 'Country data unavailable in this environment (no CDN geo headers).',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Analytics unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

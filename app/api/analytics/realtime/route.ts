import { NextResponse } from 'next/server';
import { createAnalyticsAdminClient, requireAnalyticsAccess } from '@/lib/analytics/auth';

/** Active = last_activity within 5 minutes. */
export async function GET(request: Request) {
  const access = await requireAnalyticsAccess();
  if ('error' in access && access.error) return access.error;

  const surface = new URL(request.url).searchParams.get('surface') || 'web';
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  try {
    const admin = createAnalyticsAdminClient();
    let q = admin
      .from('site_sessions')
      .select(
        'id, visitor_id, exit_path, device_type, browser, os, source, medium, country, last_activity_at, is_internal, is_bot, surface'
      )
      .eq('is_bot', false)
      .gte('last_activity_at', since)
      .order('last_activity_at', { ascending: false })
      .limit(100);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allRows = data ?? [];
    const surfaceBlock = (rows: typeof allRows) => ({
      activeUsers: new Set(rows.map((r) => r.visitor_id)).size,
      activeSessions: rows.length,
    });
    const webRows = allRows.filter((r) => r.surface !== 'app' && !r.is_internal);
    const appRows = allRows.filter((r) => r.surface === 'app');
    const surfaces = {
      web: surfaceBlock(webRows),
      app: surfaceBlock(appRows),
    };

    const rows = surface === 'web' ? webRows : surface === 'app' ? appRows : allRows;
    const activeUsers = new Set(rows.map((r) => r.visitor_id)).size;
    const byPage = new Map<string, number>();
    for (const r of rows) {
      const p = r.exit_path || '/';
      byPage.set(p, (byPage.get(p) || 0) + 1);
    }

    return NextResponse.json({
      activeUsers,
      activeSessions: rows.length,
      surfaces,
      windowMinutes: 5,
      pages: [...byPage.entries()]
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count),
      recent: rows.slice(0, 25).map((r) => ({
        path: r.exit_path,
        device: r.device_type,
        browser: r.browser,
        os: r.os,
        source: r.source,
        medium: r.medium,
        country: r.country || null,
        lastActivityAt: r.last_activity_at,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Realtime unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

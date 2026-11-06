import { NextResponse } from 'next/server';
import { isManagerRole, requireStaff } from '@/lib/system-access';
import { parseSocialLink, toSocialRow } from '@/lib/social-links';

export const dynamic = 'force-dynamic';

const SELECT = 'id, platform, url, icon, is_active, display_order, created_at, updated_at';

export async function GET() {
  try {
    const access = await requireStaff();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let query = access.admin
      .from('social_media_links')
      .select(SELECT)
      .order('display_order', { ascending: true })
      .limit(200);
    if (access.tenantId) query = query.or(`tenant_id.eq.${access.tenantId},tenant_id.is.null`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      items: (data ?? []).map((row) => toSocialRow(row as Record<string, unknown>)),
      can_manage: isManagerRole(access.role),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch social channels';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireStaff({ manage: true });
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const parsed = parseSocialLink(await request.json());
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { data, error } = await access.admin
      .from('social_media_links')
      .insert({ ...parsed.payload, tenant_id: access.tenantId })
      .select(SELECT)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(toSocialRow(data as Record<string, unknown>), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add social channel';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

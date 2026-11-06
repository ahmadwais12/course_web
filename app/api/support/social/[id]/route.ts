import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/system-access';
import { parseSocialLink, toSocialRow } from '@/lib/social-links';

type Params = { params: Promise<{ id: string }> };

const SELECT = 'id, platform, url, icon, is_active, display_order, created_at, updated_at';

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await requireStaff({ manage: true });
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const parsed = parseSocialLink(await request.json());
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { data, error } = await access.admin
      .from('social_media_links')
      .update({ ...parsed.payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(SELECT)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Social channel not found' }, { status: 404 });
    return NextResponse.json(toSocialRow(data as Record<string, unknown>));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update social channel';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await requireStaff({ manage: true });
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const { error } = await access.admin.from('social_media_links').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete social channel';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

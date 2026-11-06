import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { GUARD_NAME } from '@/lib/rbac';
import { softDeleteEntity } from '@/lib/soft-delete';
import { requestMeta } from '@/lib/system-access';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Permission name is required' }, { status: 400 });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('permissions')
      .update({ name, guard_name: GUARD_NAME, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update permission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const meta = requestMeta(request);
    const { data: actorProfile } = await admin
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    const result = await softDeleteEntity({
      admin,
      entityType: 'permission',
      entityId: id,
      deletedBy: user.id,
      tenantId: (actorProfile?.tenant_id as string | null) ?? null,
      audit: {
        userId: user.id,
        tenantId: (actorProfile?.tenant_id as string | null) ?? null,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, soft_deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete permission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

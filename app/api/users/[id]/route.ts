import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { softDeleteEntity } from '@/lib/soft-delete';
import { logAccountWork } from '@/lib/audit';
import { requestMeta } from '@/lib/system-access';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const fullName = String(body.full_name ?? body.name ?? '').trim();
    const email = String(body.email ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const roleId = body.role ? String(body.role).trim() : '';
    const tenantId = body.tenant_id === null || body.tenant_id === ''
      ? null
      : body.tenant_id
        ? String(body.tenant_id)
        : undefined;
    const status = body.status !== undefined ? String(body.status) : undefined;

    if (!id) {
      return NextResponse.json({ error: 'User id required' }, { status: 400 });
    }

    const supabase = await createClient();
    let roleName: string | undefined;

    if (roleId) {
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id, name, slug')
        .eq('id', roleId)
        .maybeSingle();
      if (roleError || !role) {
        return NextResponse.json({ error: 'Role not found' }, { status: 404 });
      }
      roleName = role.slug || role.name;

      await supabase.from('model_has_roles').delete().eq('model_id', id).eq('model_type', 'user');
      const { error: assignError } = await supabase.from('model_has_roles').insert({
        role_id: roleId,
        model_id: id,
        model_type: 'user',
      });
      if (assignError) {
        return NextResponse.json({ error: assignError.message }, { status: 500 });
      }
    }

    const patch: Record<string, unknown> = {};
    if (fullName) patch.full_name = fullName;
    if (email) patch.email = email;
    if (phone !== undefined) patch.phone = phone || null;
    if (roleName) patch.role = roleName;
    if (tenantId !== undefined) patch.tenant_id = tenantId;
    if (status !== undefined) patch.is_active = status === 'active';

    const { data: profile, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      const {
        data: { user: actor },
      } = await supabase.auth.getUser();
      if (actor) {
        const admin = createSupabaseAdminClient();
        const meta = requestMeta(request);
        const { data: actorProfile } = await admin
          .from('users')
          .select('tenant_id')
          .eq('id', actor.id)
          .maybeSingle();
        await logAccountWork(
          {
            admin,
            userId: actor.id,
            tenantId: (actorProfile?.tenant_id as string | null) ?? null,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
          },
          {
            action: 'update',
            entityType: 'user',
            entityId: id,
            tableName: 'users',
            historyAction: 'update',
            details: { display_name: profile?.full_name || profile?.email || id },
            newValues: patch,
          }
        );
      }
    } catch {
      /* logging must not break updates */
    }

    return NextResponse.json({ message: 'User updated successfully', user: profile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
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
      entityType: 'user',
      entityId: id,
      deletedBy: user.id,
      tenantId: (actorProfile?.tenant_id as string | null) ?? null,
      extraPatch: { is_active: false },
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

    return NextResponse.json({ message: 'User moved to trash', soft_deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

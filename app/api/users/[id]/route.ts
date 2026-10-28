import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    return NextResponse.json({ message: 'User updated successfully', user: profile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    await supabase.from('model_has_roles').delete().eq('model_id', id).eq('model_type', 'user');
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

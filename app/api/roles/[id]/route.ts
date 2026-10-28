import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GUARD_NAME } from '@/lib/rbac';
import { toRoleSlug } from '@/lib/roles';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const slug = toRoleSlug(String(body.slug ?? name));
    const permissionIds: string[] = Array.isArray(body.permissions) ? body.permissions : [];
    if (!name) return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    if (!slug) return NextResponse.json({ error: 'Role slug is required' }, { status: 400 });

    const supabase = await createClient();
    const { data: role, error } = await supabase
      .from('roles')
      .update({
        name,
        slug,
        guard_name: GUARD_NAME,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('role_has_permissions').delete().eq('role_id', id);
    if (permissionIds.length > 0) {
      const rows = permissionIds.map((permission_id) => ({
        role_id: id,
        permission_id,
      }));
      const { error: syncError } = await supabase.from('role_has_permissions').insert(rows);
      if (syncError) return NextResponse.json({ error: syncError.message }, { status: 500 });
    }

    return NextResponse.json({ ...role, slug: role.slug || slug });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update role';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    await supabase.from('role_has_permissions').delete().eq('role_id', id);
    await supabase.from('model_has_roles').delete().eq('role_id', id);
    const { error } = await supabase.from('roles').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete role';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

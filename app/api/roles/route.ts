import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GUARD_NAME } from '@/lib/rbac';
import { toRoleSlug } from '@/lib/roles';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .eq('guard_name', GUARD_NAME)
      .order('name');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const roleIds = (roles ?? []).map((r) => r.id);
    if (roleIds.length === 0) return NextResponse.json([]);

    const { data: pivots } = await supabase
      .from('role_has_permissions')
      .select('role_id, permission_id')
      .in('role_id', roleIds);

    const permissionIds = [...new Set((pivots ?? []).map((p) => p.permission_id))];
    const { data: permissions } = permissionIds.length
      ? await supabase.from('permissions').select('*').in('id', permissionIds)
      : { data: [] as { id: string; name: string; guard_name: string }[] };

    const permById = new Map((permissions ?? []).map((p) => [p.id, p]));

    const result = (roles ?? []).map((role) => ({
      ...role,
      slug: role.slug || toRoleSlug(role.name),
      permissions: (pivots ?? [])
        .filter((p) => p.role_id === role.id)
        .map((p) => permById.get(p.permission_id))
        .filter(Boolean),
    }));

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch roles';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Create role + syncPermissions(permissionIds) — uses roles.slug for users.role */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const slug = toRoleSlug(String(body.slug ?? name));
    const permissionIds: string[] = Array.isArray(body.permissions) ? body.permissions : [];
    if (!name) return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    if (!slug) return NextResponse.json({ error: 'Role slug is required' }, { status: 400 });

    const supabase = await createClient();
    const { data: role, error } = await supabase
      .from('roles')
      .insert({ name, slug, guard_name: GUARD_NAME })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (permissionIds.length > 0) {
      const rows = permissionIds.map((permission_id) => ({
        role_id: role.id,
        permission_id,
      }));
      const { error: syncError } = await supabase.from('role_has_permissions').insert(rows);
      if (syncError) return NextResponse.json({ error: syncError.message }, { status: 500 });
    }

    return NextResponse.json({ ...role, slug: role.slug || slug }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create role';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

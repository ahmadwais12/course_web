import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** KMS-style GET /abilities ? flat permission name strings for the current user */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json([], { status: 200 });

    const { data: roleLinks, error: roleErr } = await supabase
      .from('model_has_roles')
      .select('role_id')
      .eq('model_id', user.id)
      .eq('model_type', 'user');

    if (roleErr) {
      return NextResponse.json(['Team', 'Dashboard', 'User Management', 'Roles', 'Permissions', 'Create Users']);
    }

    const roleIds = (roleLinks ?? []).map((r) => r.role_id);
    if (roleIds.length === 0) {
      // Fallback: map users.role (slug) ? roles.slug / roles.name
      const { data: row } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (row?.role) {
        const { data: bySlug } = await supabase
          .from('roles')
          .select('id')
          .eq('slug', row.role)
          .eq('guard_name', 'web')
          .maybeSingle();
        if (bySlug?.id) {
          roleIds.push(bySlug.id);
        } else {
          const { data: byName } = await supabase
            .from('roles')
            .select('id')
            .eq('name', row.role)
            .eq('guard_name', 'web')
            .maybeSingle();
          if (byName?.id) roleIds.push(byName.id);
        }
      }
    }

    if (roleIds.length === 0) {
      return NextResponse.json([]);
    }

    const { data: pivots } = await supabase
      .from('role_has_permissions')
      .select('permission_id')
      .in('role_id', roleIds);

    const permissionIds = [...new Set((pivots ?? []).map((p) => p.permission_id))];
    if (permissionIds.length === 0) return NextResponse.json([]);

    const { data: permissions } = await supabase
      .from('permissions')
      .select('name')
      .in('id', permissionIds);

    const names = [...new Set((permissions ?? []).map((p) => p.name))];
    return NextResponse.json(names);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load abilities';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Flat permission names for a user, resolved from model_has_roles → role_has_permissions.
 * Falls back to users.role (matched against roles.slug, then roles.name) when the user has no
 * explicit role links. `error` is true when the role links could not be read at all.
 */
export async function loadUserAbilities(
  db: SupabaseClient,
  userId: string
): Promise<{ abilities: string[]; error: boolean }> {
  const { data: roleLinks, error: roleErr } = await db
    .from('model_has_roles')
    .select('role_id')
    .eq('model_id', userId)
    .eq('model_type', 'user');

  if (roleErr) return { abilities: [], error: true };

  const roleIds = ((roleLinks ?? []) as { role_id: string }[]).map((r) => r.role_id);
  if (roleIds.length === 0) {
    const { data: row } = await db.from('users').select('role').eq('id', userId).maybeSingle();
    const role = (row as { role?: string | null } | null)?.role;
    if (role) {
      const { data: bySlug } = await db
        .from('roles')
        .select('id')
        .eq('slug', role)
        .eq('guard_name', 'web')
        .maybeSingle();
      if ((bySlug as { id?: string } | null)?.id) {
        roleIds.push((bySlug as { id: string }).id);
      } else {
        const { data: byName } = await db
          .from('roles')
          .select('id')
          .eq('name', role)
          .eq('guard_name', 'web')
          .maybeSingle();
        if ((byName as { id?: string } | null)?.id) roleIds.push((byName as { id: string }).id);
      }
    }
  }

  if (roleIds.length === 0) return { abilities: [], error: false };

  const { data: pivots } = await db
    .from('role_has_permissions')
    .select('permission_id')
    .in('role_id', roleIds);

  const permissionIds = [
    ...new Set(((pivots ?? []) as { permission_id: string }[]).map((p) => p.permission_id)),
  ];
  if (permissionIds.length === 0) return { abilities: [], error: false };

  const { data: permissions } = await db.from('permissions').select('name').in('id', permissionIds);
  const names = [...new Set(((permissions ?? []) as { name: string }[]).map((p) => p.name))];
  return { abilities: names, error: false };
}

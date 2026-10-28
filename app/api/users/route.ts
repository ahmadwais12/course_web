import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: profiles, error } = await supabase
      .from('users')
      .select('id, email, full_name, phone, role, is_active, tenant_id, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const ids = (profiles ?? []).map((p) => p.id);
    const { data: links } = ids.length
      ? await supabase
          .from('model_has_roles')
          .select('model_id, role_id')
          .eq('model_type', 'user')
          .in('model_id', ids)
      : { data: [] as { model_id: string; role_id: string }[] };

    const roleIds = [...new Set((links ?? []).map((l) => l.role_id))];
    const { data: roles } = roleIds.length
      ? await supabase.from('roles').select('id, name, slug').in('id', roleIds)
      : { data: [] as { id: string; name: string; slug: string }[] };

    const roleById = new Map((roles ?? []).map((r) => [r.id, r]));

    const users = (profiles ?? []).map((profile) => {
      const assigned = (links ?? [])
        .filter((l) => l.model_id === profile.id)
        .map((l) => roleById.get(l.role_id))
        .filter(Boolean);
      return {
        ...profile,
        status: profile.is_active ? 'active' : 'inactive',
        roles: assigned,
        role_name: assigned[0]?.name ?? profile.role,
      };
    });

    return NextResponse.json(users);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Create user — KMS workflow:
 * 1) Client already created Supabase Auth user (signUp) and sends uuid
 * 2) We upsert users + assignRole(role_id) via model_has_roles
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const uuid = String(body.uuid ?? '').trim();
    const email = String(body.email ?? '').trim();
    const fullName = String(body.full_name ?? body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const roleId = String(body.role ?? '').trim();
    const tenantId = body.tenant_id ? String(body.tenant_id) : null;
    const status = String(body.status ?? 'active');

    if (!uuid || !email || !fullName || !roleId) {
      return NextResponse.json(
        { error: 'uuid, email, full_name, and role are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, name, slug')
      .eq('id', roleId)
      .maybeSingle();

    if (roleError || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const roleSlug = role.slug || role.name;

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .upsert({
        id: uuid,
        email,
        full_name: fullName,
        phone: phone || null,
        role: roleSlug,
        tenant_id: tenantId,
        is_active: status === 'active',
      })
      .select('*')
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // assignRole / syncRoles([roleId])
    await supabase.from('model_has_roles').delete().eq('model_id', uuid).eq('model_type', 'user');
    const { error: assignError } = await supabase.from('model_has_roles').insert({
      role_id: roleId,
      model_id: uuid,
      model_type: 'user',
    });

    if (assignError) {
      return NextResponse.json({ error: assignError.message }, { status: 500 });
    }

    return NextResponse.json({ ...profile, roles: [role] }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

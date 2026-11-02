import { NextResponse } from 'next/server';
import { requireBusinessAdmin } from '@/lib/business-access';
import {
  allocateTenantCode,
  BUSINESS_SELECT,
  businessStatusFromRow,
  normalizeTenantPayload,
  optionalTenantColumns,
  slugIsTaken,
  withoutMissingProfileColumns,
  withBusinessMeta,
} from '@/lib/business';
import { isReservedBusinessSlug } from '@/lib/business-url';

export const dynamic = 'force-dynamic';

/** List businesses (central) and/or branches. Default: central only. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'central').toLowerCase();
    const parentId = searchParams.get('parent_id');

    const access = await requireBusinessAdmin();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const supabase = access.admin;
    let query = supabase.from('tenants').select(BUSINESS_SELECT).order('name');

    if (type === 'central') {
      query = query.eq('organization_type', 'central');
    } else if (type === 'branch') {
      query = query.eq('organization_type', 'branch');
      if (parentId) query = query.eq('parent_tenant_id', parentId);
    }

    const { data, error } = await query.limit(500);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data ?? [];

    if (type === 'central' || type === 'all') {
      const { data: branches } = await supabase
        .from('tenants')
        .select('parent_tenant_id')
        .eq('organization_type', 'branch');

      const counts = new Map<string, number>();
      for (const b of branches ?? []) {
        if (!b.parent_tenant_id) continue;
        counts.set(b.parent_tenant_id, (counts.get(b.parent_tenant_id) ?? 0) + 1);
      }

      if (type === 'central') {
        return NextResponse.json(
          rows.map((r) => withBusinessMeta({ ...r, branch_count: counts.get(r.id) ?? 0 }))
        );
      }
    }

    if (type === 'branch' || type === 'all') {
      const parentIds = [
        ...new Set(rows.map((r) => r.parent_tenant_id).filter(Boolean) as string[]),
      ];
      const namesById = new Map<string, string>();
      if (parentIds.length) {
        const { data: parents } = await supabase
          .from('tenants')
          .select('id, name')
          .in('id', parentIds);
        for (const p of parents ?? []) namesById.set(p.id, p.name);
      }
      return NextResponse.json(
        rows.map((r) =>
          withBusinessMeta({
            ...r,
            parent_name: r.parent_tenant_id ? namesById.get(r.parent_tenant_id) ?? null : null,
          })
        )
      );
    }

    return NextResponse.json(rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch businesses';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Create a business (central) or branch. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = normalizeTenantPayload(body);

    if (!payload.name || !payload.slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    if (payload.organization_type === 'central' && isReservedBusinessSlug(payload.slug)) {
      return NextResponse.json(
        { error: 'This slug is reserved. Choose another public URL.' },
        { status: 400 }
      );
    }

    if (payload.organization_type === 'branch' && !payload.parent_tenant_id) {
      return NextResponse.json(
        { error: 'Branches require a parent business (parent_tenant_id)' },
        { status: 400 }
      );
    }

    if (payload.organization_type === 'central') {
      payload.parent_tenant_id = null;
      payload.is_active = false;
      payload.settings = { ...payload.settings, status: 'pending' };
    }

    const access = await requireBusinessAdmin();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const supabase = access.admin;
    let parentCode: string | null = null;

    if (payload.parent_tenant_id) {
      const { data: parent, error: parentError } = await supabase
        .from('tenants')
        .select('id, organization_type, is_active, tenant_code, settings')
        .eq('id', payload.parent_tenant_id)
        .maybeSingle();

      if (parentError) {
        return NextResponse.json({ error: parentError.message }, { status: 500 });
      }
      const parentStatus = parent ? businessStatusFromRow(parent) : null;
      if (!parent || parent.organization_type !== 'central' || parentStatus === 'inactive') {
        return NextResponse.json(
          { error: 'Parent must be a central business that is not inactive' },
          { status: 400 }
        );
      }
      parentCode = parent.tenant_code || null;
    }

    if (await slugIsTaken(supabase, payload.slug)) {
      return NextResponse.json(
        { error: 'This public URL is already used. Choose another slug.' },
        { status: 400 }
      );
    }

    payload.tenant_code = await allocateTenantCode(supabase, payload.organization_type, parentCode);

    const coverUrl = body.cover_url ? String(body.cover_url).trim() : null;
    const profileColumns = optionalTenantColumns(body);
    const insertPayload = {
      ...payload,
      ...profileColumns,
      ...(coverUrl ? { cover_url: coverUrl } : {}),
    };

    let { data, error } = await supabase
      .from('tenants')
      .insert(insertPayload)
      .select(BUSINESS_SELECT)
      .single();

    if (error && /cover_url|bio|tagline|city|country/i.test(error.message)) {
      const retry = await supabase
        .from('tenants')
        .insert(payload)
        .select(BUSINESS_SELECT)
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error && /slug/i.test(error.message)) {
      return NextResponse.json(
        { error: 'This public URL is already used. Choose another slug.' },
        { status: 400 }
      );
    }

    if (error && /tenant_code|duplicate|unique/i.test(error.message)) {
      payload.tenant_code = await allocateTenantCode(
        supabase,
        payload.organization_type,
        parentCode
      );
      const retry = await supabase
        .from('tenants')
        .insert(
          withoutMissingProfileColumns(
            {
              ...payload,
              ...profileColumns,
              ...(coverUrl ? { cover_url: coverUrl } : {}),
            },
            error.message
          )
        )
        .select(BUSINESS_SELECT)
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(
      withBusinessMeta({
        ...(data ?? {}),
        cover_url:
          coverUrl ??
          (data as { settings?: { cover_url?: string } } | null)?.settings?.cover_url ??
          null,
      }),
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create business';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

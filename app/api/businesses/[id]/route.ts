import { NextResponse } from 'next/server';
import { requireBusinessAdmin } from '@/lib/business-access';
import {
  BUSINESS_SELECT,
  appendStatusNote,
  descriptionTextFromNotes,
  normalizeBusinessStatus,
  normalizeTenantPayload,
  optionalTenantColumns,
  slugIsTaken,
  statusNotesFromRow,
  withBusinessMeta,
} from '@/lib/business';
import { isReservedBusinessSlug } from '@/lib/business-url';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await requireBusinessAdmin();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const supabase = access.admin;

    const { data, error } = await supabase
      .from('tenants')
      .select(BUSINESS_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { data: branches, error: branchError } = await supabase
      .from('tenants')
      .select(BUSINESS_SELECT)
      .eq('organization_type', 'branch')
      .eq('parent_tenant_id', id)
      .order('name');

    if (branchError) {
      return NextResponse.json({ error: branchError.message }, { status: 500 });
    }

    return NextResponse.json({
      ...withBusinessMeta(data),
      branch_count: branches?.length ?? 0,
      branches: (branches ?? []).map((b) => withBusinessMeta(b)),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch business';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const access = await requireBusinessAdmin();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const supabase = access.admin;

    const { data: existing, error: existingError } = await supabase
      .from('tenants')
      .select(BUSINESS_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    if (body.status != null && body.name == null) {
      const status = normalizeBusinessStatus(body.status);
      const noteText = body.description != null ? String(body.description).trim() : '';
      const existingSettings = (existing.settings as Record<string, unknown> | null) ?? {};
      const settings = noteText
        ? {
            ...appendStatusNote(
              existingSettings,
              {
                text: noteText,
                status,
                from: normalizeBusinessStatus(
                  (existingSettings.status as string) ??
                    (existing as { is_active?: boolean }).is_active
                ),
                at: new Date().toISOString(),
              },
              (existing as { description?: string | null }).description
            ),
            status,
          }
        : { ...existingSettings, status };
      const notes = statusNotesFromRow({ settings });
      const { data, error } = await supabase
        .from('tenants')
        .update({
          is_active: status === 'active',
          settings,
          description: descriptionTextFromNotes(notes) || existing.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(BUSINESS_SELECT)
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(withBusinessMeta(data));
    }

    const payload = normalizeTenantPayload({
      ...existing,
      ...body,
      settings: {
        ...((existing.settings as Record<string, unknown> | null) ?? {}),
        ...(body.settings && typeof body.settings === 'object' && !Array.isArray(body.settings)
          ? body.settings
          : {}),
      },
    });

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
        { error: 'Branches require a parent business' },
        { status: 400 }
      );
    }

    if (payload.organization_type === 'central') {
      payload.parent_tenant_id = null;
    }

    if (await slugIsTaken(supabase, payload.slug, id)) {
      return NextResponse.json(
        { error: 'This public URL is already used. Choose another slug.' },
        { status: 400 }
      );
    }
    const { tenant_code: _ignoredCode, ...safePayload } = payload;
    const profileColumns = optionalTenantColumns(body);
    let { data, error } = await supabase
      .from('tenants')
      .update({ ...safePayload, ...profileColumns, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(BUSINESS_SELECT)
      .single();

    if (error && /bio|tagline|city|country/i.test(error.message)) {
      const retry = await supabase
        .from('tenants')
        .update({ ...safePayload, updated_at: new Date().toISOString() })
        .eq('id', id)
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(withBusinessMeta(data));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update business';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await requireBusinessAdmin();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const supabase = access.admin;

    const { count } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('parent_tenant_id', id);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Delete or reassign branches before deleting this business' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete business';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

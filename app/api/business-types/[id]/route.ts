import { NextResponse } from 'next/server';
import { normalizeBusinessType, type BusinessTypeRow } from '@/lib/business-types';
import {
  isStoreError,
  requireBusinessTypesStore,
  saveToSettings,
} from '@/lib/business-types-store';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const store = await requireBusinessTypesStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }

    if (store.source === 'table') {
      const { data: current, error: findError } = await store.admin
        .from('business_types')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
      if (!current) return NextResponse.json({ error: 'Business type not found' }, { status: 404 });

      const next = normalizeBusinessType(body, current as BusinessTypeRow);
      const { data, error } = await store.admin
        .from('business_types')
        .update({
          name: next.name,
          slug: next.slug,
          description: next.description,
          status: next.status,
          is_active: next.is_active,
          updated_at: next.updated_at,
        })
        .eq('id', id)
        .select('*')
        .single();
      if (error && /status/i.test(error.message)) {
        const retry = await store.admin
          .from('business_types')
          .update({
            name: next.name,
            slug: next.slug,
            description: next.description,
            is_active: next.is_active,
            updated_at: next.updated_at,
          })
          .eq('id', id)
          .select('*')
          .single();
        if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 });
        return NextResponse.json({ ...retry.data, status: next.status, is_active: next.is_active });
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ...data, status: next.status, is_active: next.is_active });
    }

    const current = store.items.find((t) => t.id === id);
    if (!current) return NextResponse.json({ error: 'Business type not found' }, { status: 404 });
    const next = normalizeBusinessType(body, current);
    const items = store.items.map((t) => (t.id === id ? next : t));
    await saveToSettings(store.admin, items, store.tenantId, store.rowId);
    return NextResponse.json(next);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update business type';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const store = await requireBusinessTypesStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }

    if (store.source === 'table') {
      const { softDeleteEntity } = await import('@/lib/soft-delete');
      const { requestMeta } = await import('@/lib/system-access');
      const meta = requestMeta(request);
      const { createClient } = await import('@/lib/supabase/server');
      const auth = await createClient();
      const {
        data: { user: actor },
      } = await auth.auth.getUser();
      if (!actor) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

      const result = await softDeleteEntity({
        admin: store.admin,
        entityType: 'business_type',
        entityId: id,
        deletedBy: actor.id,
        tenantId: store.tenantId ?? null,
        extraPatch: { is_active: false, status: 'inactive' },
        audit: {
          userId: actor.id,
          tenantId: store.tenantId ?? null,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });
      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ ok: true, soft_deleted: true });
    }

    const items = store.items.filter((t) => t.id !== id);
    if (items.length === store.items.length) {
      return NextResponse.json({ error: 'Business type not found' }, { status: 404 });
    }
    await saveToSettings(store.admin, items, store.tenantId, store.rowId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete business type';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

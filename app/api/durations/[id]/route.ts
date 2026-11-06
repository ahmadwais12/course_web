import { NextResponse } from 'next/server';
import { normalizeDuration, type DurationRow } from '@/lib/durations';
import {
  isStoreError,
  requireDurationsStore,
  saveToSettings,
} from '@/lib/durations-store';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const store = await requireDurationsStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }

    if (store.source === 'table') {
      const { data: current, error: findError } = await store.admin
        .from('durations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
      if (!current) return NextResponse.json({ error: 'Duration not found' }, { status: 404 });

      const next = normalizeDuration(body, current as DurationRow);
      const { data, error } = await store.admin
        .from('durations')
        .update({
          name: next.name,
          slug: next.slug,
          months: next.months,
          description: next.description,
          sort_order: next.sort_order,
          status: next.status,
          is_active: next.is_active,
          updated_at: next.updated_at,
        })
        .eq('id', id)
        .select('*')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    const current = store.items.find((d) => d.id === id);
    if (!current) return NextResponse.json({ error: 'Duration not found' }, { status: 404 });
    const next = normalizeDuration(body, current);
    const items = store.items
      .map((d) => (d.id === id ? next : d))
      .sort((a, b) => a.sort_order - b.sort_order || a.months - b.months);
    await saveToSettings(store.admin, items, store.tenantId, store.rowId);
    return NextResponse.json(next);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update duration';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const store = await requireDurationsStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }

    if (store.source === 'table') {
      const auth = await createClient();
      const {
        data: { user: actor },
      } = await auth.auth.getUser();
      if (!actor) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

      const { error } = await store.admin
        .from('durations')
        .update({
          is_active: false,
          status: 'inactive',
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, soft_deleted: true });
    }

    const items = store.items.filter((d) => d.id !== id);
    if (items.length === store.items.length) {
      return NextResponse.json({ error: 'Duration not found' }, { status: 404 });
    }
    await saveToSettings(store.admin, items, store.tenantId, store.rowId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete duration';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

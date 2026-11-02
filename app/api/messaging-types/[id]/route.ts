import { NextResponse } from 'next/server';
import { normalizeMessagingType, type MessagingTypeRow } from '@/lib/messaging-types';
import {
  isStoreError,
  requireMessagingTypesStore,
  saveToSettings,
} from '@/lib/messaging-types-store';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const store = await requireMessagingTypesStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }

    if (store.source === 'table') {
      const { data: current, error: findError } = await store.admin
        .from('messaging_types')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
      if (!current) return NextResponse.json({ error: 'Messaging type not found' }, { status: 404 });

      const next = normalizeMessagingType(body, current as MessagingTypeRow);
      const { data, error } = await store.admin
        .from('messaging_types')
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
          .from('messaging_types')
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
    if (!current) return NextResponse.json({ error: 'Messaging type not found' }, { status: 404 });
    const next = normalizeMessagingType(body, current);
    const items = store.items.map((t) => (t.id === id ? next : t));
    await saveToSettings(store.admin, items, store.tenantId, store.rowId);
    return NextResponse.json(next);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update messaging type';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const store = await requireMessagingTypesStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }

    if (store.source === 'table') {
      const { error } = await store.admin.from('messaging_types').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const items = store.items.filter((t) => t.id !== id);
    if (items.length === store.items.length) {
      return NextResponse.json({ error: 'Messaging type not found' }, { status: 404 });
    }
    await saveToSettings(store.admin, items, store.tenantId, store.rowId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete messaging type';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { normalizeDuration } from '@/lib/durations';
import {
  isStoreError,
  requireDurationsStore,
  saveToSettings,
  seedIfEmpty,
} from '@/lib/durations-store';

export async function GET() {
  try {
    const store = await requireDurationsStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }
    const items = await seedIfEmpty(store);
    return NextResponse.json(items);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load durations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const next = normalizeDuration(body);
    if (!next.name || !next.months) {
      return NextResponse.json({ error: 'Name and months are required' }, { status: 400 });
    }

    const store = await requireDurationsStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }

    if (store.source === 'table') {
      const { data, error } = await store.admin
        .from('durations')
        .insert({
          name: next.name,
          slug: next.slug,
          months: next.months,
          description: next.description,
          sort_order: next.sort_order,
          status: next.status,
          is_active: next.is_active,
        })
        .select('*')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data, { status: 201 });
    }

    if (store.items.some((d) => d.slug === next.slug)) {
      return NextResponse.json({ error: 'A duration with this slug already exists' }, { status: 400 });
    }
    const items = [...store.items, next].sort(
      (a, b) => a.sort_order - b.sort_order || a.months - b.months
    );
    await saveToSettings(store.admin, items, store.tenantId, store.rowId);
    return NextResponse.json(next, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create duration';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

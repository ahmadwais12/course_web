import { NextResponse } from 'next/server';
import { normalizeStudentLevel } from '@/lib/student-levels';
import {
  isStoreError,
  requireStudentLevelsStore,
  saveToSettings,
  seedIfEmpty,
} from '@/lib/student-levels-store';

export async function GET() {
  try {
    const store = await requireStudentLevelsStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }
    const items = await seedIfEmpty(store);
    return NextResponse.json(items);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load student levels';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const next = normalizeStudentLevel(body);
    if (!next.name || !next.slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const store = await requireStudentLevelsStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }

    if (store.source === 'table') {
      const { data, error } = await store.admin
        .from('student_levels')
        .insert({
          name: next.name,
          slug: next.slug,
          description: next.description,
          sort_order: next.sort_order,
          status: next.status,
          is_active: next.is_active,
        })
        .select('*')
        .single();
      if (error && /status|sort_order/i.test(error.message)) {
        const retry = await store.admin
          .from('student_levels')
          .insert({
            name: next.name,
            slug: next.slug,
            description: next.description,
            is_active: next.is_active,
          })
          .select('*')
          .single();
        if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 });
        return NextResponse.json(
          { ...retry.data, status: next.status, is_active: next.is_active, sort_order: next.sort_order },
          { status: 201 }
        );
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(
        { ...data, status: next.status, is_active: next.is_active },
        { status: 201 }
      );
    }

    if (store.items.some((t) => t.slug === next.slug)) {
      return NextResponse.json({ error: 'A level with this slug already exists' }, { status: 400 });
    }

    const items = [...store.items, next].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    await saveToSettings(store.admin, items, store.tenantId, store.rowId);
    return NextResponse.json(next, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create student level';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

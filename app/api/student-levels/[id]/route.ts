import { NextResponse } from 'next/server';
import { normalizeStudentLevel, type StudentLevelRow } from '@/lib/student-levels';
import {
  isStoreError,
  requireStudentLevelsStore,
  saveToSettings,
} from '@/lib/student-levels-store';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const store = await requireStudentLevelsStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }

    if (store.source === 'table') {
      const { data: current, error: findError } = await store.admin
        .from('student_levels')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
      if (!current) return NextResponse.json({ error: 'Student level not found' }, { status: 404 });

      const next = normalizeStudentLevel(body, current as StudentLevelRow);
      const { data, error } = await store.admin
        .from('student_levels')
        .update({
          name: next.name,
          slug: next.slug,
          description: next.description,
          sort_order: next.sort_order,
          status: next.status,
          is_active: next.is_active,
          updated_at: next.updated_at,
        })
        .eq('id', id)
        .select('*')
        .single();
      if (error && /status|sort_order/i.test(error.message)) {
        const retry = await store.admin
          .from('student_levels')
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
        return NextResponse.json({
          ...retry.data,
          status: next.status,
          is_active: next.is_active,
          sort_order: next.sort_order,
        });
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ...data, status: next.status, is_active: next.is_active });
    }

    const current = store.items.find((t) => t.id === id);
    if (!current) return NextResponse.json({ error: 'Student level not found' }, { status: 404 });
    const next = normalizeStudentLevel(body, current);
    const items = store.items
      .map((t) => (t.id === id ? next : t))
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    await saveToSettings(store.admin, items, store.tenantId, store.rowId);
    return NextResponse.json(next);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update student level';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const store = await requireStudentLevelsStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }

    if (store.source === 'table') {
      const { softDeleteEntity } = await import('@/lib/soft-delete');
      const { requestMeta } = await import('@/lib/system-access');
      const { createClient } = await import('@/lib/supabase/server');
      const meta = requestMeta(request);
      const auth = await createClient();
      const {
        data: { user: actor },
      } = await auth.auth.getUser();
      if (!actor) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

      const result = await softDeleteEntity({
        admin: store.admin,
        entityType: 'student_level',
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
      return NextResponse.json({ error: 'Student level not found' }, { status: 404 });
    }
    await saveToSettings(store.admin, items, store.tenantId, store.rowId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete student level';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

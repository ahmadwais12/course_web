import { NextResponse } from 'next/server';
import {
  hydrateBusinessPlan,
  normalizeBusinessPlan,
  planTablePayload,
  type BusinessPlanRow,
} from '@/lib/business-plans';
import {
  isStoreError,
  requireBusinessPlansStore,
  saveToSettings,
} from '@/lib/business-plans-store';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const store = await requireBusinessPlansStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }

    if (store.source === 'table') {
      const { data: current, error: findError } = await store.admin
        .from('business_plans')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
      if (!current) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

      const next = normalizeBusinessPlan(body, hydrateBusinessPlan(current as Partial<BusinessPlanRow>));
      const payload = planTablePayload(next);
      let { data, error } = await store.admin
        .from('business_plans')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error && /price|currency|billing_interval|duration_months|trial_days|max_users|max_storage_mb|max_branches|features|sort_order/i.test(error.message)) {
        const retry = await store.admin
          .from('business_plans')
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
        data = retry.data;
        error = retry.error;
      }

      if (error && /status/i.test(error.message)) {
        const retry = await store.admin
          .from('business_plans')
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
        return NextResponse.json({ ...next, ...retry.data });
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ...next, ...data });
    }

    const current = store.items.find((item) => item.id === id);
    if (!current) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    const next = normalizeBusinessPlan(body, current);
    const items = store.items.map((item) => (item.id === id ? next : item));
    await saveToSettings(store.admin, items, store.tenantId, store.rowId);
    return NextResponse.json(next);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const store = await requireBusinessPlansStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }

    if (store.source === 'table') {
      const { error } = await store.admin.from('business_plans').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const items = store.items.filter((item) => item.id !== id);
    if (items.length === store.items.length) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    await saveToSettings(store.admin, items, store.tenantId, store.rowId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

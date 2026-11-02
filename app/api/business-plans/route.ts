import { NextResponse } from 'next/server';
import { normalizeBusinessPlan, planTablePayload } from '@/lib/business-plans';
import {
  isStoreError,
  requireBusinessPlansStore,
  saveToSettings,
  seedIfEmpty,
} from '@/lib/business-plans-store';

export async function GET() {
  try {
    const store = await requireBusinessPlansStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }
    const items = await seedIfEmpty(store);
    return NextResponse.json(items);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load plans';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const next = normalizeBusinessPlan(body);
    if (!next.name || !next.slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const store = await requireBusinessPlansStore();
    if (isStoreError(store)) {
      return NextResponse.json({ error: store.error }, { status: store.status });
    }

    if (store.source === 'table') {
      const payload = planTablePayload(next);
      let { data, error } = await store.admin.from('business_plans').insert(payload).select('*').single();

      if (error && /price|currency|billing_interval|duration_months|trial_days|max_users|max_storage_mb|max_branches|features|sort_order/i.test(error.message)) {
        const retry = await store.admin
          .from('business_plans')
          .insert({
            name: next.name,
            slug: next.slug,
            description: next.description,
            status: next.status,
            is_active: next.is_active,
          })
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error && /status/i.test(error.message)) {
        const retry = await store.admin
          .from('business_plans')
          .insert({
            name: next.name,
            slug: next.slug,
            description: next.description,
            is_active: next.is_active,
          })
          .select('*')
          .single();
        if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 });
        return NextResponse.json({ ...next, ...retry.data }, { status: 201 });
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ...next, ...data }, { status: 201 });
    }

    if (store.items.some((item) => item.slug === next.slug)) {
      return NextResponse.json({ error: 'A plan with this slug already exists' }, { status: 400 });
    }

    const items = [...store.items, next];
    await saveToSettings(store.admin, items, store.tenantId, store.rowId);
    return NextResponse.json(next, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

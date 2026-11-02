import { NextResponse } from 'next/server';
import { requireBusinessAdmin } from '@/lib/business-access';
import { allocateTenantCode } from '@/lib/business';

/** Preview the next system-issued business or branch code. */
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

    if (type === 'branch') {
      let parentCode: string | null = null;
      if (parentId) {
        const { data: parent, error } = await supabase
          .from('tenants')
          .select('tenant_code')
          .eq('id', parentId)
          .maybeSingle();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        parentCode = parent?.tenant_code || null;
      }
      const tenant_code = await allocateTenantCode(supabase, 'branch', parentCode);
      return NextResponse.json({ tenant_code });
    }

    const tenant_code = await allocateTenantCode(supabase, 'central');
    return NextResponse.json({ tenant_code });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load next code';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

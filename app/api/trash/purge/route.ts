import { NextResponse } from 'next/server';
import { requireSystemAdmin, requestMeta } from '@/lib/system-access';
import { purgeEntity, type SoftDeleteEntityType, ENTITY_TABLE } from '@/lib/soft-delete';

export async function POST(request: Request) {
  try {
    const access = await requireSystemAdmin();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const entityType = String(body.entity_type ?? '').trim() as SoftDeleteEntityType;
    const entityId = String(body.entity_id ?? '').trim();

    if (!entityType || !ENTITY_TABLE[entityType]) {
      return NextResponse.json({ error: 'Invalid entity_type' }, { status: 400 });
    }
    if (!entityId) {
      return NextResponse.json({ error: 'entity_id is required' }, { status: 400 });
    }

    const meta = requestMeta(request);
    const result = await purgeEntity({
      admin: access.admin,
      entityType,
      entityId,
      audit: {
        userId: access.user.id,
        tenantId: access.tenantId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (entityType === 'user') {
      // Erase the sign-in identity too, otherwise the email stays registered in Supabase Auth.
      try {
        await access.admin.auth.admin.deleteUser(entityId);
      } catch {
        /* profile row is already gone; a missing auth user is fine */
      }
    }

    return NextResponse.json({ ok: true, message: 'Permanently deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to purge';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

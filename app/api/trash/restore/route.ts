import { NextResponse } from 'next/server';
import { requireSystemAdmin, requestMeta } from '@/lib/system-access';
import { restoreEntity, type SoftDeleteEntityType, ENTITY_TABLE } from '@/lib/soft-delete';

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
    const result = await restoreEntity({
      admin: access.admin,
      entityType,
      entityId,
      restoredBy: access.user.id,
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
      // Completing an account deletion request bans the auth user; restoring lifts it.
      try {
        await access.admin.auth.admin.updateUserById(entityId, { ban_duration: 'none' });
      } catch {
        /* the profile is restored even if the auth user is missing */
      }
    }

    return NextResponse.json({ ok: true, message: 'Restored successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to restore';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

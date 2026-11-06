import { NextResponse } from 'next/server';
import { requestMeta, requireStaff } from '@/lib/system-access';
import { softDeleteEntity } from '@/lib/soft-delete';
import { notifyUsers } from '@/lib/communication-server';
import { DELETION_SELECT, clean, deletionDbError } from '@/lib/account-deletion-server';
import type { DeletionRequestRow } from '@/lib/account-deletion';

export const dynamic = 'force-dynamic';

const SYSTEM_ROLES = new Set(['super_admin', 'ceo']);
/** Supabase has no permanent ban; 100 years is the documented way to block sign-in. */
const BAN_FOREVER = '876000h';

type Params = { params: Promise<{ id: string }> };

/**
 * `{ action: 'complete' | 'reject', admin_note? }`
 * - complete: moves the linked user to Trash (inactive, sign-in blocked) and closes the request.
 * - reject: closes the request without deleting; a note is required and is sent to the user.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const access = await requireStaff({ manage: true });
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
    const isSystem = SYSTEM_ROLES.has(access.role ?? '');

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? '');
    const note = clean(body.admin_note, 2000) || null;
    if (action !== 'complete' && action !== 'reject') {
      return NextResponse.json({ error: 'action must be complete or reject' }, { status: 400 });
    }

    const { data: found, error: findError } = await access.admin
      .from('account_deletion_requests')
      .select(DELETION_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (findError) return NextResponse.json({ error: deletionDbError(findError) }, { status: 500 });
    const row = found as DeletionRequestRow | null;
    if (!row) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (!isSystem && row.tenant_id !== access.tenantId) {
      return NextResponse.json({ error: 'This request belongs to another business' }, { status: 403 });
    }
    if (row.status !== 'pending') {
      return NextResponse.json({ error: `This request is already ${row.status}.` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const meta = requestMeta(request);
    let userId = row.user_id;
    let outcome = '';

    if (action === 'reject') {
      if (!note) {
        return NextResponse.json({ error: 'Add a note explaining why the request is rejected.' }, { status: 400 });
      }
      outcome = 'Request rejected.';
      if (userId) {
        try {
          await notifyUsers(access.admin, [userId], {
            title: 'Account deletion request not completed',
            message: note,
            tenantId: row.tenant_id,
            type: 'system',
            priority: 'high',
            actionUrl: '/account-deletion',
          });
        } catch {
          /* the decision is saved even if the notice fails */
        }
      }
    } else {
      if (!userId) {
        const { data: match } = await access.admin
          .from('users')
          .select('id')
          .ilike('email', row.email.replace(/[\\%_]/g, '\\$&'))
          .limit(1)
          .maybeSingle();
        userId = (match?.id as string | undefined) ?? null;
      }

      if (!userId) {
        outcome = 'No account uses this email, so there was nothing to delete. The request is closed.';
      } else {
        if (userId === access.user.id) {
          return NextResponse.json(
            { error: 'You cannot delete your own account from here. Ask another administrator.' },
            { status: 400 }
          );
        }
        const { data: target } = await access.admin
          .from('users')
          .select('id, role, tenant_id, deleted_at')
          .eq('id', userId)
          .maybeSingle();
        if (target && SYSTEM_ROLES.has(String(target.role ?? '')) && !isSystem) {
          return NextResponse.json(
            { error: 'Only a super admin or CEO can delete this account.' },
            { status: 403 }
          );
        }
        if (target && !isSystem && target.tenant_id && target.tenant_id !== access.tenantId) {
          return NextResponse.json({ error: 'This account belongs to another business' }, { status: 403 });
        }

        if (target && !target.deleted_at) {
          const result = await softDeleteEntity({
            admin: access.admin,
            entityType: 'user',
            entityId: userId,
            deletedBy: access.user.id,
            tenantId: (target.tenant_id as string | null) ?? null,
            extraPatch: { is_active: false },
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
        }

        let signInBlocked = true;
        try {
          const { error: banError } = await access.admin.auth.admin.updateUserById(userId, {
            ban_duration: BAN_FOREVER,
          });
          if (banError) signInBlocked = false;
        } catch {
          signInBlocked = false;
        }

        outcome = signInBlocked
          ? 'Account moved to Trash and sign-in blocked. Purge it from Trash to erase it permanently.'
          : 'Account moved to Trash and deactivated. Sign-in could not be blocked in Supabase Auth; check the auth user.';
      }
    }

    const { data: updated, error: updateError } = await access.admin
      .from('account_deletion_requests')
      .update({
        status: action === 'complete' ? 'completed' : 'rejected',
        admin_note: note,
        reviewed_by: access.user.id,
        reviewed_at: now,
        user_id: userId,
        updated_at: now,
      })
      .eq('id', id)
      .select(DELETION_SELECT)
      .single();
    if (updateError) return NextResponse.json({ error: deletionDbError(updateError) }, { status: 500 });

    return NextResponse.json({ ok: true, message: outcome, request: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

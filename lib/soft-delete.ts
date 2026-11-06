import type { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { logAccountWork, type AuditContext } from '@/lib/audit';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type SoftDeleteEntityType =
  | 'user'
  | 'tenant'
  | 'business_type'
  | 'business_plan'
  | 'messaging_type'
  | 'student_level'
  | 'role'
  | 'permission';

export const ENTITY_TABLE: Record<SoftDeleteEntityType, string> = {
  user: 'users',
  tenant: 'tenants',
  business_type: 'business_types',
  business_plan: 'business_plans',
  messaging_type: 'messaging_types',
  student_level: 'student_levels',
  role: 'roles',
  permission: 'permissions',
};

export const ENTITY_LABELS: Record<SoftDeleteEntityType, string> = {
  user: 'User',
  tenant: 'Business',
  business_type: 'Business Type',
  business_plan: 'Plan',
  messaging_type: 'Messaging Type',
  student_level: 'Student Level',
  role: 'Role',
  permission: 'Permission',
};

function displayNameFromRow(entityType: SoftDeleteEntityType, row: Record<string, unknown>) {
  if (entityType === 'user') {
    return String(row.full_name || row.email || row.id || 'User');
  }
  return String(row.name || row.slug || row.id || ENTITY_LABELS[entityType]);
}

export async function softDeleteEntity(opts: {
  admin: AdminClient;
  entityType: SoftDeleteEntityType;
  entityId: string;
  deletedBy: string;
  tenantId?: string | null;
  audit?: Omit<AuditContext, 'admin'>;
  extraPatch?: Record<string, unknown>;
}) {
  const table = ENTITY_TABLE[opts.entityType];
  const now = new Date().toISOString();

  const { data: existing, error: findError } = await opts.admin
    .from(table)
    .select('*')
    .eq('id', opts.entityId)
    .maybeSingle();

  if (findError) return { error: findError.message, status: 500 as const };
  if (!existing) return { error: 'Record not found', status: 404 as const };
  if ((existing as { deleted_at?: string | null }).deleted_at) {
    return { error: 'Already in trash', status: 400 as const };
  }

  const patch: Record<string, unknown> = {
    deleted_at: now,
    deleted_by: opts.deletedBy,
    updated_at: now,
    ...opts.extraPatch,
  };

  const { data: updated, error: updateError } = await opts.admin
    .from(table)
    .update(patch)
    .eq('id', opts.entityId)
    .select('*')
    .single();

  if (updateError) {
    // Column may be missing if migration not applied
    if (/deleted_at|deleted_by/i.test(updateError.message)) {
      return {
        error: 'Soft delete is not enabled yet. Apply migration 20261103_soft_delete_logs_trash.sql',
        status: 500 as const,
      };
    }
    return { error: updateError.message, status: 500 as const };
  }

  const row = (updated ?? existing) as Record<string, unknown>;
  const displayName = displayNameFromRow(opts.entityType, row);
  const tenantId =
    opts.tenantId ??
    (typeof row.tenant_id === 'string' ? row.tenant_id : null) ??
    (opts.entityType === 'tenant' ? opts.entityId : null);

  await opts.admin.from('trash_index').upsert(
    {
      entity_type: opts.entityType,
      entity_id: opts.entityId,
      table_name: table,
      display_name: displayName,
      snapshot: row,
      tenant_id: tenantId,
      deleted_by: opts.deletedBy,
      deleted_at: now,
    },
    { onConflict: 'entity_type,entity_id' }
  );

  if (opts.audit) {
    const ctx: AuditContext = { admin: opts.admin, ...opts.audit, tenantId: opts.audit.tenantId ?? tenantId };
    await logAccountWork(ctx, {
      action: 'soft_delete',
      entityType: opts.entityType,
      entityId: opts.entityId,
      tableName: table,
      historyAction: 'soft_delete',
      details: { display_name: displayName },
      oldValues: existing as Record<string, unknown>,
      newValues: { deleted_at: now, deleted_by: opts.deletedBy },
    });
  }

  return { ok: true as const, row, displayName };
}

export async function restoreEntity(opts: {
  admin: AdminClient;
  entityType: SoftDeleteEntityType;
  entityId: string;
  restoredBy: string;
  audit?: Omit<AuditContext, 'admin'>;
}) {
  const table = ENTITY_TABLE[opts.entityType];
  const now = new Date().toISOString();

  const { data: existing, error: findError } = await opts.admin
    .from(table)
    .select('*')
    .eq('id', opts.entityId)
    .maybeSingle();

  if (findError) return { error: findError.message, status: 500 as const };
  if (!existing) return { error: 'Record not found', status: 404 as const };
  if (!(existing as { deleted_at?: string | null }).deleted_at) {
    return { error: 'Record is not in trash', status: 400 as const };
  }

  const patch: Record<string, unknown> = {
    deleted_at: null,
    deleted_by: null,
    updated_at: now,
  };
  if (opts.entityType === 'user') {
    patch.is_active = true;
  }

  const { error: updateError } = await opts.admin.from(table).update(patch).eq('id', opts.entityId);
  if (updateError) return { error: updateError.message, status: 500 as const };

  await opts.admin
    .from('trash_index')
    .delete()
    .eq('entity_type', opts.entityType)
    .eq('entity_id', opts.entityId);

  if (opts.audit) {
    const tenantId =
      opts.audit.tenantId ??
      (typeof (existing as { tenant_id?: string }).tenant_id === 'string'
        ? (existing as { tenant_id: string }).tenant_id
        : null);
    const ctx: AuditContext = { admin: opts.admin, ...opts.audit, tenantId };
    await logAccountWork(ctx, {
      action: 'restore',
      entityType: opts.entityType,
      entityId: opts.entityId,
      tableName: table,
      historyAction: 'restore',
      details: {
        display_name: displayNameFromRow(opts.entityType, existing as Record<string, unknown>),
      },
      oldValues: { deleted_at: (existing as { deleted_at?: string }).deleted_at },
      newValues: { deleted_at: null, restored_by: opts.restoredBy },
    });
  }

  return { ok: true as const };
}

export async function purgeEntity(opts: {
  admin: AdminClient;
  entityType: SoftDeleteEntityType;
  entityId: string;
  audit?: Omit<AuditContext, 'admin'>;
}) {
  const table = ENTITY_TABLE[opts.entityType];

  const { data: existing, error: findError } = await opts.admin
    .from(table)
    .select('*')
    .eq('id', opts.entityId)
    .maybeSingle();

  if (findError) return { error: findError.message, status: 500 as const };
  if (!existing) return { error: 'Record not found', status: 404 as const };
  if (!(existing as { deleted_at?: string | null }).deleted_at) {
    return { error: 'Purge only allowed for trash items. Soft-delete first.', status: 400 as const };
  }

  if (opts.entityType === 'role') {
    await opts.admin.from('role_has_permissions').delete().eq('role_id', opts.entityId);
    await opts.admin.from('model_has_roles').delete().eq('role_id', opts.entityId);
  }
  if (opts.entityType === 'permission') {
    await opts.admin.from('role_has_permissions').delete().eq('permission_id', opts.entityId);
  }
  if (opts.entityType === 'user') {
    await opts.admin.from('model_has_roles').delete().eq('model_id', opts.entityId).eq('model_type', 'user');
  }
  if (opts.entityType === 'tenant') {
    const { count } = await opts.admin
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('parent_tenant_id', opts.entityId)
      .is('deleted_at', null);
    if ((count ?? 0) > 0) {
      return { error: 'Delete or purge branches before purging this business', status: 400 as const };
    }
  }

  const { error: deleteError } = await opts.admin.from(table).delete().eq('id', opts.entityId);
  if (deleteError) return { error: deleteError.message, status: 500 as const };

  await opts.admin
    .from('trash_index')
    .delete()
    .eq('entity_type', opts.entityType)
    .eq('entity_id', opts.entityId);

  if (opts.audit) {
    const ctx: AuditContext = { admin: opts.admin, ...opts.audit };
    await logAccountWork(ctx, {
      action: 'purge',
      entityType: opts.entityType,
      entityId: opts.entityId,
      tableName: table,
      historyAction: 'delete',
      details: {
        display_name: displayNameFromRow(opts.entityType, existing as Record<string, unknown>),
      },
      oldValues: existing as Record<string, unknown>,
      newValues: null,
    });
  }

  return { ok: true as const };
}

/** Apply `.is('deleted_at', null)` when the column exists; ignore if migration pending. */
export function notDeleted<T extends { is: (col: string, val: null) => T }>(query: T): T {
  return query.is('deleted_at', null);
}

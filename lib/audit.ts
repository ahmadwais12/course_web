import type { createSupabaseAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type AuditContext = {
  admin: AdminClient;
  userId?: string | null;
  tenantId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type SystemLogInput = {
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
};

export type AuditLogInput = {
  action: string;
  tableName: string;
  recordId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
};

export type RecordHistoryInput = {
  action: 'insert' | 'update' | 'delete' | 'soft_delete' | 'restore';
  tableName: string;
  recordId: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  restoredAt?: string | null;
  restoredBy?: string | null;
};

/** Best-effort activity write — never throws to callers. */
export async function writeSystemLog(ctx: AuditContext, input: SystemLogInput) {
  try {
    const { error } = await ctx.admin.from('system_logs').insert({
      tenant_id: ctx.tenantId ?? null,
      user_id: ctx.userId ?? null,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      details: input.details ?? null,
      ip_address: ctx.ipAddress ?? null,
      user_agent: ctx.userAgent ?? null,
    });
    if (error) console.error('[audit] system_logs', error.message);
  } catch (e) {
    console.error('[audit] system_logs', e);
  }
}

export async function writeAuditLog(ctx: AuditContext, input: AuditLogInput) {
  try {
    const { error } = await ctx.admin.from('audit_log').insert({
      tenant_id: ctx.tenantId ?? null,
      user_id: ctx.userId ?? null,
      action: input.action,
      table_name: input.tableName,
      record_id: input.recordId ?? null,
      old_values: input.oldValues ?? null,
      new_values: input.newValues ?? null,
      ip_address: ctx.ipAddress ?? null,
      user_agent: ctx.userAgent ?? null,
    });
    if (error) console.error('[audit] audit_log', error.message);
  } catch (e) {
    console.error('[audit] audit_log', e);
  }
}

export async function writeRecordHistory(ctx: AuditContext, input: RecordHistoryInput) {
  try {
    const { error } = await ctx.admin.from('record_history').insert({
      tenant_id: ctx.tenantId ?? null,
      table_name: input.tableName,
      record_id: input.recordId,
      action: input.action,
      old_data: input.oldData ?? null,
      new_data: input.newData ?? null,
      changed_by: ctx.userId ?? null,
      ip_address: ctx.ipAddress ?? null,
      user_agent: ctx.userAgent ?? null,
      restored_at: input.restoredAt ?? null,
      restored_by: input.restoredBy ?? null,
      archive_date: input.action === 'soft_delete' ? new Date().toISOString().slice(0, 10) : null,
    });
    if (error) console.error('[audit] record_history', error.message);
  } catch (e) {
    console.error('[audit] record_history', e);
  }
}

/** Write system + audit + history for a mutation in one call. */
export async function logAccountWork(
  ctx: AuditContext,
  opts: {
    action: string;
    entityType: string;
    entityId: string;
    tableName: string;
    historyAction?: RecordHistoryInput['action'];
    details?: Record<string, unknown> | null;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
  }
) {
  await Promise.all([
    writeSystemLog(ctx, {
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId,
      details: opts.details,
    }),
    writeAuditLog(ctx, {
      action: opts.action,
      tableName: opts.tableName,
      recordId: opts.entityId,
      oldValues: opts.oldValues,
      newValues: opts.newValues,
    }),
    opts.historyAction
      ? writeRecordHistory(ctx, {
          action: opts.historyAction,
          tableName: opts.tableName,
          recordId: opts.entityId,
          oldData: opts.oldValues,
          newData: opts.newValues,
          restoredAt: opts.historyAction === 'restore' ? new Date().toISOString() : null,
          restoredBy: opts.historyAction === 'restore' ? ctx.userId ?? null : null,
        })
      : Promise.resolve(),
  ]);
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { writeSystemLog } from '@/lib/audit';
import { resolveAIContext } from '@/lib/ai/context';
import { AIError } from '@/lib/ai/errors';
import { isOrgAdminRole, isPlatformRole } from '@/lib/ai/modules';
import type { AIRequestContext } from '@/lib/ai/types';
import { clientMeta } from '@/lib/ai/http';

/** Global AI configuration (provider, plans, pricing, every organization) — platform owners only. */
export async function requirePlatformAdmin() {
  const { ctx, admin } = await resolveAIContext();
  if (!isPlatformRole(ctx.role)) throw new AIError('forbidden', 'Platform admin required');
  return { ctx, admin };
}

/** Organization-level AI settings — org admins for their own organization only. */
export async function requireOrgAdmin() {
  const { ctx, admin } = await resolveAIContext();
  if (!isOrgAdminRole(ctx.role)) throw new AIError('forbidden', 'Organization admin required');
  if (!ctx.organizationId) throw new AIError('no_organization');
  return { ctx, admin };
}

export async function auditAIChange(
  admin: SupabaseClient,
  ctx: AIRequestContext,
  request: Request,
  input: { action: string; entityType: string; entityId?: string | null; details?: Record<string, unknown> }
) {
  await writeSystemLog(
    { admin, userId: ctx.userId, tenantId: ctx.tenantId, ...clientMeta(request) },
    {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      details: input.details ?? null,
    }
  );
}

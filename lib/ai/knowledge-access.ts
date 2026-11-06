import { requireOrgAdmin, requirePlatformAdmin } from '@/lib/ai/admin-access';
import { AIError } from '@/lib/ai/errors';

/**
 * `global` documents (tenant_id NULL) are managed by platform admins; `organization` documents
 * belong to the caller's own billing organization — the tenant id never comes from the request.
 */
export async function resolveKnowledgeScope(scope: string | null) {
  if (scope === 'global') {
    const { ctx, admin } = await requirePlatformAdmin();
    return { ctx, admin, tenantId: null as string | null };
  }
  if (scope && scope !== 'organization') throw new AIError('invalid_input', 'scope must be global or organization');
  const { ctx, admin } = await requireOrgAdmin();
  return { ctx, admin, tenantId: ctx.organizationId as string };
}

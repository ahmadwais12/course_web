import { NextResponse } from 'next/server';
import { auditAIChange } from '@/lib/ai/admin-access';
import { AIError } from '@/lib/ai/errors';
import { aiErrorResponse } from '@/lib/ai/http';
import { deleteDocument } from '@/lib/ai/knowledge';
import { resolveKnowledgeScope } from '@/lib/ai/knowledge-access';
import { isUuid } from '@/lib/ai/security';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** Query: scope=global|organization. A document can only be deleted from its own scope. */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!isUuid(id)) throw new AIError('not_found');
    const scope = new URL(request.url).searchParams.get('scope');
    const { ctx, admin, tenantId } = await resolveKnowledgeScope(scope);
    await deleteDocument(admin, id, tenantId);
    await auditAIChange(admin, ctx, request, {
      action: 'ai.knowledge.deleted',
      entityType: 'ai_knowledge_documents',
      entityId: id,
      details: { scope: tenantId ? 'organization' : 'global' },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return aiErrorResponse(error, 'ai/knowledge');
  }
}

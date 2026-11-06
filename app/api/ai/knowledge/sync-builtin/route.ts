import { NextResponse } from 'next/server';
import { auditAIChange, requirePlatformAdmin } from '@/lib/ai/admin-access';
import { aiErrorResponse } from '@/lib/ai/http';
import { syncBuiltinDocs } from '@/lib/ai/knowledge';
import { getAIProvider } from '@/lib/ai/providers';
import { loadGlobalSettings, loadPricing } from '@/lib/ai/settings';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Re-index the built-in DreamFlow documentation into the global knowledge base. */
export async function POST(request: Request) {
  try {
    const { ctx, admin } = await requirePlatformAdmin();
    const settings = await loadGlobalSettings(admin);
    const pricing = await loadPricing(admin);
    const count = await syncBuiltinDocs(admin, getAIProvider(settings), settings, pricing, ctx.userId);
    await auditAIChange(admin, ctx, request, {
      action: 'ai.knowledge.builtin_synced',
      entityType: 'ai_knowledge_documents',
      details: { documents: count },
    });
    return NextResponse.json({ documents: count });
  } catch (error) {
    return aiErrorResponse(error, 'ai/knowledge/sync');
  }
}

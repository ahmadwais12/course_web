import { NextResponse } from 'next/server';
import { auditAIChange, requirePlatformAdmin } from '@/lib/ai/admin-access';
import { AIError, isMissingTableError } from '@/lib/ai/errors';
import { aiErrorResponse } from '@/lib/ai/http';

export const dynamic = 'force-dynamic';

/** Delete conversations older than the retention period (and soft-deleted ones after 7 days). */
export async function POST(request: Request) {
  try {
    const { ctx, admin } = await requirePlatformAdmin();
    const { data, error } = await admin.rpc('ai_apply_retention');
    if (error) {
      if (isMissingTableError(error)) throw new AIError('ai_tables_missing', error.message);
      throw new AIError('internal', error.message);
    }
    const deleted = Number(data ?? 0);
    await auditAIChange(admin, ctx, request, {
      action: 'ai.retention.applied',
      entityType: 'ai_conversations',
      details: { deleted_conversations: deleted },
    });
    return NextResponse.json({ deleted });
  } catch (error) {
    return aiErrorResponse(error, 'ai/admin/retention');
  }
}

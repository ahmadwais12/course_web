import { NextResponse } from 'next/server';
import { setMessageFeedback } from '@/lib/ai/conversations';
import { resolveAIContext } from '@/lib/ai/context';
import { AIError } from '@/lib/ai/errors';
import { aiErrorResponse, readJson } from '@/lib/ai/http';
import { isUuid } from '@/lib/ai/security';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** Body: { feedback: 1 | -1 | null, comment?: string } — only on the user's own assistant messages. */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!isUuid(id)) throw new AIError('not_found');
    const body = await readJson(request);
    const feedback = body.feedback === 1 || body.feedback === -1 ? body.feedback : body.feedback === null ? null : undefined;
    if (feedback === undefined) throw new AIError('invalid_input', 'feedback must be 1, -1, or null');
    const { ctx, admin } = await resolveAIContext();
    await setMessageFeedback(admin, ctx, id, feedback, typeof body.comment === 'string' ? body.comment : null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return aiErrorResponse(error, 'ai/feedback');
  }
}

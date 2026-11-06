import { NextResponse } from 'next/server';
import { auditAIChange, requirePlatformAdmin } from '@/lib/ai/admin-access';
import { AIError, AI_ERROR_MESSAGES } from '@/lib/ai/errors';
import { aiErrorResponse } from '@/lib/ai/http';
import { getAIProvider } from '@/lib/ai/providers';
import { AIProviderError } from '@/lib/ai/providers/types';
import { redactSecrets } from '@/lib/ai/security';
import { EMBEDDING_DIMENSIONS, loadGlobalSettings, loadPricing } from '@/lib/ai/settings';
import { logAuxUsage } from '@/lib/ai/usage';

export const dynamic = 'force-dynamic';

/** Check connectivity to the configured chat and embedding models without exposing credentials. */
export async function POST(request: Request) {
  try {
    const { ctx, admin } = await requirePlatformAdmin();
    const settings = await loadGlobalSettings(admin);
    const pricing = await loadPricing(admin);
    const provider = getAIProvider(settings);

    const started = Date.now();
    const result: Record<string, unknown> = { provider: settings.provider, model: settings.model };
    try {
      const reply = await provider.generate({
        model: settings.model,
        system: 'You are a connectivity check. Reply with the single word OK.',
        contents: [{ role: 'user', parts: [{ text: 'Connectivity check' }] }],
        temperature: 0,
        maxOutputTokens: 20,
        thinkingBudget: settings.thinking_budget,
      });
      result.chat = { ok: true, latency_ms: Date.now() - started, model: reply.model, reply: reply.text.slice(0, 40) };
      await logAuxUsage(admin, {
        requestType: 'test',
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        provider: settings.provider,
        model: reply.model,
        inputTokens: reply.usage.inputTokens,
        outputTokens: reply.usage.outputTokens,
        durationMs: Date.now() - started,
        status: 'success',
        pricing,
      });
    } catch (error) {
      result.chat = {
        ok: false,
        latency_ms: Date.now() - started,
        error: error instanceof AIProviderError ? error.category : 'internal',
        message: error instanceof Error ? redactSecrets(error.message).slice(0, 200) : AI_ERROR_MESSAGES.internal,
      };
    }

    const embedStarted = Date.now();
    try {
      await provider.embed(['connectivity check'], {
        model: settings.embedding_model,
        task: 'RETRIEVAL_QUERY',
        dimensions: EMBEDDING_DIMENSIONS,
      });
      result.embedding = { ok: true, latency_ms: Date.now() - embedStarted, model: settings.embedding_model };
    } catch (error) {
      result.embedding = {
        ok: false,
        latency_ms: Date.now() - embedStarted,
        error: error instanceof AIProviderError ? error.category : 'internal',
        message: error instanceof Error ? redactSecrets(error.message).slice(0, 200) : AI_ERROR_MESSAGES.internal,
      };
    }

    await auditAIChange(admin, ctx, request, {
      action: 'ai.provider.tested',
      entityType: 'ai_settings',
      entityId: '1',
      details: {
        chat_ok: (result.chat as { ok: boolean }).ok,
        embedding_ok: (result.embedding as { ok: boolean }).ok,
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AIError && error.code === 'provider_not_configured') {
      return NextResponse.json({ chat: { ok: false, error: 'not_configured', message: error.message } }, { status: 200 });
    }
    return aiErrorResponse(error, 'ai/admin/test');
  }
}

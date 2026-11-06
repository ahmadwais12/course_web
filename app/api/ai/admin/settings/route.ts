import { NextResponse } from 'next/server';
import { auditAIChange, requirePlatformAdmin } from '@/lib/ai/admin-access';
import { AIError } from '@/lib/ai/errors';
import { aiErrorResponse, readJson } from '@/lib/ai/http';
import { SUPPORTED_PROVIDERS, isProviderConfigured } from '@/lib/ai/providers';
import { loadGlobalSettings, type AIGlobalSettings } from '@/lib/ai/settings';

export const dynamic = 'force-dynamic';

const MODEL_ID = /^[A-Za-z0-9.\-_]{1,80}$/;

function payload(settings: AIGlobalSettings) {
  return {
    settings,
    providers: SUPPORTED_PROVIDERS.map((p) => ({ id: p, label: p === 'gemini' ? 'Google Gemini' : p })),
    // Only a boolean — the key itself never leaves the server.
    api_key_configured: isProviderConfigured(settings.provider),
    api_key_env: 'GEMINI_API_KEY',
  };
}

export async function GET() {
  try {
    const { admin } = await requirePlatformAdmin();
    return NextResponse.json(payload(await loadGlobalSettings(admin)));
  } catch (error) {
    return aiErrorResponse(error, 'ai/admin/settings');
  }
}

function intIn(value: unknown, min: number, max: number, field: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new AIError('invalid_input', `${field} must be between ${min} and ${max}`);
  return Math.round(n);
}

export async function PUT(request: Request) {
  try {
    const body = await readJson(request);
    const { ctx, admin } = await requirePlatformAdmin();
    const current = await loadGlobalSettings(admin);
    const next: Record<string, unknown> = {};

    if (body.enabled !== undefined) next.enabled = Boolean(body.enabled);
    if (body.provider !== undefined) {
      if (!(SUPPORTED_PROVIDERS as readonly string[]).includes(String(body.provider))) {
        throw new AIError('invalid_input', 'Unsupported provider');
      }
      next.provider = String(body.provider);
    }
    for (const field of ['model', 'embedding_model'] as const) {
      if (body[field] !== undefined) {
        const value = String(body[field]).trim();
        if (!MODEL_ID.test(value)) throw new AIError('invalid_input', `${field} is not a valid model id`);
        next[field] = value;
      }
    }
    if (body.temperature !== undefined) {
      const t = Number(body.temperature);
      if (!Number.isFinite(t) || t < 0 || t > 1) throw new AIError('invalid_input', 'temperature must be between 0 and 1');
      next.temperature = Math.round(t * 100) / 100;
    }
    if (body.max_output_tokens !== undefined) next.max_output_tokens = intIn(body.max_output_tokens, 128, 8192, 'max_output_tokens');
    if (body.request_timeout_ms !== undefined) next.request_timeout_ms = intIn(body.request_timeout_ms, 5000, 120000, 'request_timeout_ms');
    if (body.thinking_budget !== undefined) {
      next.thinking_budget = body.thinking_budget === null || body.thinking_budget === '' ? null : intIn(body.thinking_budget, 0, 8192, 'thinking_budget');
    }
    if (body.retention_days !== undefined) next.retention_days = intIn(body.retention_days, 7, 3650, 'retention_days');
    if (body.max_input_chars !== undefined) next.max_input_chars = intIn(body.max_input_chars, 200, 20000, 'max_input_chars');
    if (body.history_messages !== undefined) next.history_messages = intIn(body.history_messages, 2, 40, 'history_messages');
    if (body.capabilities && typeof body.capabilities === 'object') {
      const caps = body.capabilities as Record<string, unknown>;
      next.capabilities = {
        platform_support: caps.platform_support !== false,
        business_data: caps.business_data !== false,
        knowledge_base: caps.knowledge_base !== false,
      };
    }
    if (!Object.keys(next).length) throw new AIError('invalid_input', 'Nothing to update');

    const { error } = await admin
      .from('ai_settings')
      .upsert({ id: 1, ...next, updated_by: ctx.userId, updated_at: new Date().toISOString() });
    if (error) throw new AIError('internal', error.message);

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [key, value] of Object.entries(next)) {
      const before = (current as unknown as Record<string, unknown>)[key];
      if (JSON.stringify(before) !== JSON.stringify(value)) changes[key] = { from: before, to: value };
    }
    await auditAIChange(admin, ctx, request, {
      action: 'ai.settings.updated',
      entityType: 'ai_settings',
      entityId: '1',
      details: { changes },
    });
    return NextResponse.json(payload(await loadGlobalSettings(admin)));
  } catch (error) {
    return aiErrorResponse(error, 'ai/admin/settings');
  }
}

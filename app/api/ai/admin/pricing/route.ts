import { NextResponse } from 'next/server';
import { auditAIChange, requirePlatformAdmin } from '@/lib/ai/admin-access';
import { AIError } from '@/lib/ai/errors';
import { aiErrorResponse, readJson } from '@/lib/ai/http';
import { SUPPORTED_PROVIDERS } from '@/lib/ai/providers';
import { loadPricing } from '@/lib/ai/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { admin } = await requirePlatformAdmin();
    return NextResponse.json({ data: await loadPricing(admin) });
  } catch (error) {
    return aiErrorResponse(error, 'ai/admin/pricing');
  }
}

function price(value: unknown, field: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 10_000) throw new AIError('invalid_input', `${field} must be a number ≥ 0`);
  return n;
}

/** Upsert a model price (per 1M tokens). Used only for estimated-cost reporting. */
export async function PUT(request: Request) {
  try {
    const body = await readJson(request);
    const { ctx, admin } = await requirePlatformAdmin();
    const provider = String(body.provider ?? 'gemini');
    if (!(SUPPORTED_PROVIDERS as readonly string[]).includes(provider)) throw new AIError('invalid_input', 'Unsupported provider');
    const model = String(body.model ?? '').trim();
    if (!/^[A-Za-z0-9.\-_]{1,80}$/.test(model)) throw new AIError('invalid_input', 'Invalid model id');
    const currency = String(body.currency ?? 'USD').toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new AIError('invalid_input', 'currency must be a 3-letter code');
    const row = {
      provider,
      model,
      input_per_million: price(body.input_per_million, 'input_per_million'),
      output_per_million: price(body.output_per_million, 'output_per_million'),
      currency,
      is_active: body.is_active !== false,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from('ai_model_pricing').upsert(row, { onConflict: 'provider,model' });
    if (error) throw new AIError('internal', error.message);
    await auditAIChange(admin, ctx, request, {
      action: 'ai.pricing.updated',
      entityType: 'ai_model_pricing',
      entityId: `${provider}:${model}`,
      details: row,
    });
    return NextResponse.json({ data: await loadPricing(admin) });
  } catch (error) {
    return aiErrorResponse(error, 'ai/admin/pricing');
  }
}

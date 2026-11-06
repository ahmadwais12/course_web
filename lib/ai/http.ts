import { NextResponse } from 'next/server';
import { AIError, AI_ERROR_MESSAGES, type AIErrorCode } from '@/lib/ai/errors';
import { AIProviderError } from '@/lib/ai/providers/types';
import { redactSecrets } from '@/lib/ai/security';

const PROVIDER_CODES: Record<AIProviderError['category'], AIErrorCode> = {
  invalid_credentials: 'provider_auth',
  rate_limited: 'provider_rate_limited',
  timeout: 'provider_timeout',
  network: 'provider_unavailable',
  unavailable: 'provider_unavailable',
  invalid_request: 'provider_unavailable',
  invalid_response: 'invalid_response',
  blocked: 'invalid_response',
};

const PROVIDER_STATUS: Partial<Record<AIErrorCode, number>> = {
  provider_auth: 502,
  provider_rate_limited: 429,
  provider_timeout: 504,
  provider_unavailable: 503,
  invalid_response: 502,
};

/** Map any error to a safe JSON response. Details are logged server-side only (redacted). */
export function aiErrorResponse(error: unknown, label = 'ai') {
  if (error instanceof AIError) {
    if (error.status >= 500 || error.detail) {
      console.error(`[${label}] ${error.code}${error.detail ? `: ${redactSecrets(error.detail)}` : ''}`);
    }
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof AIProviderError) {
    const code = PROVIDER_CODES[error.category];
    console.error(`[${label}] provider ${error.category}: ${redactSecrets(error.message)}`);
    return NextResponse.json(
      { error: AI_ERROR_MESSAGES[code], code, retryable: error.retryable },
      { status: PROVIDER_STATUS[code] ?? 502 }
    );
  }
  console.error(`[${label}] unexpected:`, error instanceof Error ? redactSecrets(error.message) : error);
  return NextResponse.json({ error: AI_ERROR_MESSAGES.internal, code: 'internal' }, { status: 500 });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  } catch {
    throw new AIError('invalid_input', 'Invalid JSON body');
  }
}

export function clientMeta(request: Request) {
  return {
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
    userAgent: request.headers.get('user-agent'),
  };
}

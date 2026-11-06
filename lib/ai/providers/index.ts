import { AIError } from '@/lib/ai/errors';
import { GeminiProvider } from '@/lib/ai/providers/gemini';
import type { AIProvider } from '@/lib/ai/providers/types';

export const SUPPORTED_PROVIDERS = ['gemini'] as const;

/**
 * Server-only credential lookup. The key is read from the environment on every call and is
 * never stored in the database, logged, or returned by any API route.
 */
export function getProviderApiKey(provider: string): string | null {
  if (provider === 'gemini') {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '';
    return key.trim() || null;
  }
  return null;
}

export function isProviderConfigured(provider: string) {
  return getProviderApiKey(provider) !== null;
}

/** AIProviderManager — returns the configured provider; never falls back to an unapproved provider. */
export function getAIProvider(settings: { provider: string; request_timeout_ms: number }): AIProvider {
  const apiKey = getProviderApiKey(settings.provider);
  if (!apiKey) throw new AIError('provider_not_configured');
  switch (settings.provider) {
    case 'gemini':
      return new GeminiProvider({ apiKey, timeoutMs: settings.request_timeout_ms });
    default:
      throw new AIError('provider_not_configured', `Unsupported provider ${settings.provider}`);
  }
}

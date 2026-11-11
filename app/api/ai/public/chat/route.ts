import { NextResponse } from 'next/server';
import { AIError } from '@/lib/ai/errors';
import { loadPublicSettings, PUBLIC_UNAVAILABLE_MESSAGE, takeGuestRateLimitToken } from '@/lib/ai/guest';
import { aiErrorResponse, clientMeta, readJson } from '@/lib/ai/http';
import { detectLanguage } from '@/lib/ai/language';
import { toISODate } from '@/lib/ai/period';
import { searchBuiltinDocs } from '@/lib/ai/platform-docs';
import { buildDocsContext, buildPublicSystemPrompt, type DocSnippet } from '@/lib/ai/prompt';
import { getAIProvider, isProviderConfigured } from '@/lib/ai/providers';
import type { ProviderContent, ProviderPart } from '@/lib/ai/providers/types';
import { redactSecrets, sanitizeUserInput } from '@/lib/ai/security';
import type { Language } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_HISTORY = 6;
const MAX_HISTORY_CHARS = 1200;
const MAX_GUEST_INPUT_CHARS = 2000;

function asLanguage(value: unknown): Language {
  return value === 'dr' || value === 'ps' ? value : 'en';
}

/** Client-supplied history for a signed-out visitor: capped, sanitized, and never trusted. */
function guestHistory(value: unknown): ProviderContent[] {
  if (!Array.isArray(value)) return [];
  const turns: ProviderContent[] = [];
  for (const item of value.slice(-MAX_HISTORY)) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as { role?: unknown }).role;
    if (role !== 'user' && role !== 'assistant') continue;
    const { text } = sanitizeUserInput((item as { content?: unknown }).content, MAX_HISTORY_CHARS);
    if (!text) continue;
    const mapped = role === 'assistant' ? 'model' : 'user';
    const last = turns[turns.length - 1];
    if (last && last.role === mapped) last.parts.push({ text });
    else turns.push({ role: mapped, parts: [{ text }] });
  }
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return turns;
}

/**
 * Public docs-only assistant. No session, no organization, no tools, no persistence:
 * the model only sees built-in platform documentation and the conversation so far.
 */
export async function POST(request: Request) {
  try {
    const ip = clientMeta(request).ipAddress ?? 'unknown';
    if (!takeGuestRateLimitToken(ip)) throw new AIError('rate_limited');

    const body = await readJson(request);
    const settings = await loadPublicSettings();
    if (!settings.enabled || !isProviderConfigured(settings.provider)) {
      return NextResponse.json(
        { error: PUBLIC_UNAVAILABLE_MESSAGE, code: settings.enabled ? 'provider_not_configured' : 'ai_disabled' },
        { status: 503 }
      );
    }

    const maxChars = Math.min(settings.max_input_chars, MAX_GUEST_INPUT_CHARS);
    const { text: message, tooLong } = sanitizeUserInput(body.message, maxChars);
    if (tooLong) throw new AIError('message_too_long');
    if (!message) throw new AIError('message_empty');

    const language = detectLanguage(message, asLanguage(body.language));
    const docs: DocSnippet[] = searchBuiltinDocs(message, 4).map((doc) => ({ ...doc, scope: 'platform' }));

    const parts: ProviderPart[] = [];
    if (docs.length) {
      parts.push({ text: `Documentation sources for this question:\n${buildDocsContext(docs, 1)}` });
    }
    parts.push({ text: message });

    const provider = getAIProvider(settings);
    const result = await provider.generate({
      model: settings.model,
      system: buildPublicSystemPrompt({ language, today: toISODate(new Date()) }),
      contents: [...guestHistory(body.history), { role: 'user', parts }],
      temperature: 0.2,
      maxOutputTokens: Math.min(settings.max_output_tokens, 900),
      thinkingBudget: settings.thinking_budget,
    });

    const reply = redactSecrets(result.text).trim();
    if (!reply) throw new AIError('invalid_response');

    return NextResponse.json({
      reply,
      language,
      sources: docs.map((doc, index) => ({ index: index + 1, title: doc.title })),
    });
  } catch (error) {
    return aiErrorResponse(error, 'ai/public/chat');
  }
}

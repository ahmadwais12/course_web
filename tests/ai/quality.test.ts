import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkText } from '@/lib/ai/chunking';
import { classifyIntent } from '@/lib/ai/intent';
import { detectLanguage } from '@/lib/ai/language';
import { ToolArgumentError, previousPeriod, resolvePeriod } from '@/lib/ai/period';
import { AIProviderError } from '@/lib/ai/providers/types';
import { parseGeminiResponse } from '@/lib/ai/providers/gemini';
import { searchBuiltinDocs } from '@/lib/ai/platform-docs';

test('language detection for English, Dari, and Pashto', () => {
  assert.equal(detectLanguage('How many students do we have?'), 'en');
  assert.equal(detectLanguage('چند شاگرد داریم؟'), 'dr');
  assert.equal(detectLanguage('زموږ څو زده کوونکي دي؟'), 'ps');
  assert.equal(detectLanguage('   ', 'dr'), 'dr');
});

test('intent routing separates how-to questions from data questions', () => {
  assert.equal(classifyIntent('How do I add a new student?').intent, 'platform_support');
  assert.deepEqual(classifyIntent('How many students do we have?'), { intent: 'business_data', module: 'academic' });
  assert.equal(classifyIntent('What was our revenue last month?').module, 'finance');
  assert.equal(classifyIntent('Show payroll for this month').module, 'payroll');
  assert.equal(classifyIntent('hello').intent, 'general');
});

test('period presets resolve to exact dates', () => {
  const now = new Date(2026, 10, 5); // Thu 5 Nov 2026
  assert.deepEqual(resolvePeriod({ period: 'last_month' }, now), { key: 'last_month', from: '2026-10-01', to: '2026-10-31', label: 'Last month' });
  assert.equal(resolvePeriod({}, now).from, '2026-11-01');
  // Week starts on Saturday.
  assert.equal(resolvePeriod({ period: 'this_week' }, now).from, '2026-10-31');
  assert.equal(resolvePeriod({ period: 'this_quarter' }, now).from, '2026-10-01');
  assert.deepEqual(previousPeriod(resolvePeriod({ period: 'this_month' }, now)), {
    key: 'custom',
    from: '2026-10-01',
    to: '2026-10-31',
    label: 'Previous month',
  });
});

test('custom periods are validated', () => {
  const now = new Date(2026, 10, 5);
  assert.equal(resolvePeriod({ from: '2026-01-01', to: '2026-03-31' }, now).key, 'custom');
  assert.throws(() => resolvePeriod({ period: 'custom', from: '2026-02-30' }, now), ToolArgumentError);
  assert.throws(() => resolvePeriod({ period: 'custom', from: '2026-05-01', to: '2026-01-01' }, now), ToolArgumentError);
  assert.throws(() => resolvePeriod({ period: 'custom', from: '2020-01-01', to: '2026-01-01' }, now), ToolArgumentError);
});

test('chunking respects size and chunk limits', () => {
  const text = Array.from({ length: 60 }, (_, i) => `Paragraph ${i}. ${'word '.repeat(40)}`).join('\n\n');
  const chunks = chunkText(text, { maxChars: 600, overlap: 80 });
  assert.ok(chunks.length > 5);
  for (const chunk of chunks) assert.ok(chunk.length <= 600 + 80, `chunk too long: ${chunk.length}`);
  assert.equal(chunkText(text, { maxChars: 600, maxChunks: 3 }).length, 3);
  assert.deepEqual(chunkText('   '), []);
});

test('Gemini responses: text, function calls, thoughts excluded, tokens counted', () => {
  const result = parseGeminiResponse(
    {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [
              { text: 'internal reasoning', thought: true },
              { text: 'Answer' },
              { functionCall: { name: 'get_student_count', args: { period: 'this_month' } } },
            ],
          },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 5, totalTokenCount: 125 },
    },
    'gemini-2.5-flash'
  );
  assert.equal(result.text, 'Answer');
  assert.deepEqual(result.functionCalls, [{ name: 'get_student_count', args: { period: 'this_month' } }]);
  assert.deepEqual(result.usage, { inputTokens: 100, outputTokens: 25, totalTokens: 125 });
});

test('Gemini blocked or empty responses raise categorized errors', () => {
  assert.throws(
    () => parseGeminiResponse({ promptFeedback: { blockReason: 'SAFETY' } }, 'm'),
    (e: unknown) => e instanceof AIProviderError && e.category === 'blocked'
  );
  assert.throws(
    () => parseGeminiResponse({}, 'm'),
    (e: unknown) => e instanceof AIProviderError && e.category === 'invalid_response'
  );
});

test('built-in guides answer common how-to questions', () => {
  const hits = searchBuiltinDocs('add student', 3);
  assert.ok(hits.length > 0);
  assert.ok(hits.every((h) => typeof h.title === 'string' && h.content.length > 0));
});

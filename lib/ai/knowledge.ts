import type { SupabaseClient } from '@supabase/supabase-js';
import { chunkText, estimateTokens } from '@/lib/ai/chunking';
import { AIError, isMissingTableError } from '@/lib/ai/errors';
import { BUILTIN_DOCS, searchBuiltinDocs } from '@/lib/ai/platform-docs';
import type { DocSnippet } from '@/lib/ai/prompt';
import type { AIProvider, ProviderUsage } from '@/lib/ai/providers/types';
import type { PricingRow } from '@/lib/ai/quota';
import { redactSecrets } from '@/lib/ai/security';
import { EMBEDDING_DIMENSIONS, type AIGlobalSettings } from '@/lib/ai/settings';
import { logAuxUsage } from '@/lib/ai/usage';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_CHARS = 400_000;
const MIN_SIMILARITY = 0.55;

const TEXT_TYPES = new Set(['text/plain', 'text/markdown', 'text/csv', 'application/json', 'text/x-markdown']);
const TEXT_EXTENSIONS = /\.(txt|md|markdown|csv|json)$/i;

export function isSupportedUpload(mimeType: string, fileName: string) {
  return mimeType === 'application/pdf' || /\.pdf$/i.test(fileName) || TEXT_TYPES.has(mimeType) || TEXT_EXTENSIONS.test(fileName);
}

export type KnowledgeDocumentRow = {
  id: string;
  tenant_id: string | null;
  title: string;
  source_type: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  module: string | null;
  language: string | null;
  status: string;
  embedding_status: string;
  chunk_count: number;
  error: string | null;
  created_at: string;
};

const DOC_COLUMNS =
  'id, tenant_id, title, source_type, file_name, mime_type, size_bytes, module, language, status, embedding_status, chunk_count, error, created_at';

type UsageCtx = { tenantId: string | null; organizationId: string | null; userId: string | null };

function dbError(error: { code?: string; message?: string }, label: string): never {
  if (isMissingTableError(error)) throw new AIError('ai_tables_missing', error.message);
  throw new AIError('internal', `${label}: ${error.message}`);
}

/** `tenantId` null = global platform documentation (super admin only). */
export async function listDocuments(admin: SupabaseClient, tenantId: string | null) {
  let query = admin.from('ai_knowledge_documents').select(DOC_COLUMNS).is('deleted_at', null);
  query = tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(200);
  if (error) dbError(error, 'list documents');
  return (data ?? []) as KnowledgeDocumentRow[];
}

export async function deleteDocument(admin: SupabaseClient, id: string, tenantId: string | null) {
  let query = admin.from('ai_knowledge_documents').select('id').eq('id', id).is('deleted_at', null);
  query = tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null);
  const { data, error } = await query.maybeSingle();
  if (error) dbError(error, 'find document');
  if (!data) throw new AIError('not_found');
  await admin.from('ai_knowledge_chunks').delete().eq('document_id', id);
  const { error: updateError } = await admin
    .from('ai_knowledge_documents')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (updateError) dbError(updateError, 'delete document');
}

async function extractUploadText(
  admin: SupabaseClient,
  provider: AIProvider,
  settings: AIGlobalSettings,
  pricing: PricingRow[],
  usageCtx: UsageCtx,
  file: { base64: string; mimeType: string; fileName: string }
) {
  if (file.mimeType === 'application/pdf' || /\.pdf$/i.test(file.fileName)) {
    const started = Date.now();
    try {
      const { text, usage } = await provider.extractText(
        { mimeType: 'application/pdf', base64: file.base64 },
        { model: settings.model, maxOutputTokens: 32000 }
      );
      await logUsage(admin, settings, pricing, usageCtx, 'extraction', settings.model, usage, Date.now() - started, 'success');
      return text;
    } catch (error) {
      await logUsage(admin, settings, pricing, usageCtx, 'extraction', settings.model, null, Date.now() - started, 'failed');
      throw error;
    }
  }
  return Buffer.from(file.base64, 'base64').toString('utf8');
}

async function logUsage(
  admin: SupabaseClient,
  settings: AIGlobalSettings,
  pricing: PricingRow[],
  usageCtx: UsageCtx,
  requestType: 'embedding' | 'extraction',
  model: string,
  usage: ProviderUsage | null,
  durationMs: number,
  status: 'success' | 'failed'
) {
  await logAuxUsage(admin, {
    requestType,
    tenantId: usageCtx.tenantId,
    organizationId: usageCtx.organizationId,
    userId: usageCtx.userId,
    provider: settings.provider,
    model,
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    durationMs,
    status,
    pricing,
  });
}

/**
 * Store, chunk, and embed a document. Embedding failures keep the document usable through
 * keyword search (embedding_status = failed) instead of losing the upload.
 */
export async function ingestDocument(
  admin: SupabaseClient,
  provider: AIProvider,
  settings: AIGlobalSettings,
  pricing: PricingRow[],
  input: {
    tenantId: string | null;
    title: string;
    sourceType: 'upload' | 'text' | 'builtin';
    module?: string | null;
    language?: string | null;
    text?: string;
    file?: { base64: string; mimeType: string; fileName: string; sizeBytes: number };
    uploadedBy: string | null;
    usageCtx: UsageCtx;
  }
) {
  const { data: doc, error } = await admin
    .from('ai_knowledge_documents')
    .insert({
      tenant_id: input.tenantId,
      title: input.title.slice(0, 200),
      source_type: input.sourceType,
      file_name: input.file?.fileName ?? null,
      mime_type: input.file?.mimeType ?? (input.text ? 'text/plain' : null),
      size_bytes: input.file?.sizeBytes ?? (input.text ? input.text.length : null),
      module: input.module ?? null,
      language: input.language ?? null,
      status: 'processing',
      uploaded_by: input.uploadedBy,
    })
    .select(DOC_COLUMNS)
    .single();
  if (error) dbError(error, 'create document');
  const docId = (doc as KnowledgeDocumentRow).id;

  const fail = async (message: string) => {
    await admin
      .from('ai_knowledge_documents')
      .update({ status: 'failed', embedding_status: 'failed', error: message.slice(0, 500), updated_at: new Date().toISOString() })
      .eq('id', docId);
  };

  try {
    const raw = input.file
      ? await extractUploadText(admin, provider, settings, pricing, input.usageCtx, input.file)
      : (input.text ?? '');
    const text = redactSecrets(raw).slice(0, MAX_DOCUMENT_CHARS);
    const chunks = chunkText(text);
    if (!chunks.length) {
      await fail('No readable text was found in this document.');
      throw new AIError('knowledge_failed', 'empty document');
    }

    let vectors: (number[] | null)[] = chunks.map(() => null);
    let embeddingStatus: 'ready' | 'failed' = 'failed';
    const started = Date.now();
    try {
      const result = await provider.embed(chunks, {
        model: settings.embedding_model,
        task: 'RETRIEVAL_DOCUMENT',
        dimensions: EMBEDDING_DIMENSIONS,
      });
      vectors = result.vectors;
      embeddingStatus = 'ready';
      await logUsage(admin, settings, pricing, input.usageCtx, 'embedding', settings.embedding_model, result.usage, Date.now() - started, 'success');
    } catch (embedError) {
      console.error('[ai] embedding failed, falling back to keyword search:', embedError instanceof Error ? embedError.message : embedError);
      await logUsage(admin, settings, pricing, input.usageCtx, 'embedding', settings.embedding_model, null, Date.now() - started, 'failed');
    }

    for (let i = 0; i < chunks.length; i += 50) {
      const rows = chunks.slice(i, i + 50).map((content, j) => ({
        document_id: docId,
        tenant_id: input.tenantId,
        chunk_index: i + j,
        content,
        embedding: vectors[i + j] ? JSON.stringify(vectors[i + j]) : null,
        token_estimate: estimateTokens(content),
      }));
      const { error: chunkError } = await admin.from('ai_knowledge_chunks').insert(rows);
      if (chunkError) throw new AIError('knowledge_failed', chunkError.message);
    }

    const { data: updated } = await admin
      .from('ai_knowledge_documents')
      .update({
        status: 'ready',
        embedding_status: embeddingStatus,
        chunk_count: chunks.length,
        error: embeddingStatus === 'failed' ? 'Embeddings unavailable; keyword search only.' : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId)
      .select(DOC_COLUMNS)
      .single();
    return (updated ?? doc) as KnowledgeDocumentRow;
  } catch (err) {
    if (!(err instanceof AIError && err.code === 'knowledge_failed' && err.detail === 'empty document')) {
      await admin.from('ai_knowledge_chunks').delete().eq('document_id', docId);
      await fail(err instanceof AIError ? err.message : 'The document could not be processed.');
    }
    if (err instanceof AIError) throw err;
    throw new AIError('knowledge_failed', err instanceof Error ? err.message : String(err));
  }
}

/** Replace the global built-in documentation with the current `BUILTIN_DOCS`. */
export async function syncBuiltinDocs(
  admin: SupabaseClient,
  provider: AIProvider,
  settings: AIGlobalSettings,
  pricing: PricingRow[],
  userId: string
) {
  const { data: existing, error } = await admin
    .from('ai_knowledge_documents')
    .select('id')
    .is('tenant_id', null)
    .eq('source_type', 'builtin');
  if (error) dbError(error, 'list builtin documents');
  const ids = ((existing ?? []) as { id: string }[]).map((d) => d.id);
  if (ids.length) await admin.from('ai_knowledge_documents').delete().in('id', ids);
  let count = 0;
  for (const doc of BUILTIN_DOCS) {
    await ingestDocument(admin, provider, settings, pricing, {
      tenantId: null,
      title: doc.title,
      sourceType: 'builtin',
      module: doc.module,
      language: 'en',
      text: `${doc.title}\n\n${doc.content}`,
      uploadedBy: userId,
      usageCtx: { tenantId: null, organizationId: null, userId },
    });
    count++;
  }
  return count;
}

type ChunkHit = { title: string; module: string | null; tenant_id: string | null; content: string };

function toSnippets(hits: ChunkHit[]): DocSnippet[] {
  return hits.map((h) => ({
    title: h.title,
    content: h.content,
    module: h.module,
    scope: h.tenant_id ? 'organization' : 'platform',
  }));
}

async function keywordSearch(admin: SupabaseClient, organizationId: string | null, query: string, limit: number) {
  const terms = [...new Set(query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 3))].slice(0, 5);
  if (!terms.length) return [] as ChunkHit[];
  const termFilter = terms.map((t) => `content.ilike.*${t.replace(/[%_,()*.]/g, '')}*`).join(',');
  let chunks = admin
    .from('ai_knowledge_chunks')
    .select('content, tenant_id, ai_knowledge_documents!inner(title, module, status, deleted_at)');
  chunks = organizationId
    ? chunks.or(`and(or(tenant_id.is.null,tenant_id.eq.${organizationId}),or(${termFilter}))`)
    : chunks.is('tenant_id', null).or(termFilter);
  const { data, error } = await chunks
    .eq('ai_knowledge_documents.status', 'ready')
    .is('ai_knowledge_documents.deleted_at', null)
    .limit(limit * 4);
  if (error) {
    if (!isMissingTableError(error)) console.error('[ai] keyword search failed:', error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as {
    content: string;
    tenant_id: string | null;
    ai_knowledge_documents: { title: string; module: string | null } | { title: string; module: string | null }[];
  }[];
  return rows
    .map((r) => {
      const docRel = Array.isArray(r.ai_knowledge_documents) ? r.ai_knowledge_documents[0] : r.ai_knowledge_documents;
      const lower = r.content.toLowerCase();
      return {
        hit: { title: docRel?.title ?? 'Document', module: docRel?.module ?? null, tenant_id: r.tenant_id, content: r.content },
        score: terms.filter((t) => lower.includes(t)).length,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.hit);
}

/**
 * Retrieve documentation for a question. The organization id comes from the server-side
 * context only, so another organization's private documents can never match.
 */
export async function searchKnowledge(
  admin: SupabaseClient,
  provider: AIProvider | null,
  settings: AIGlobalSettings,
  usageCtx: UsageCtx,
  pricing: PricingRow[],
  query: string,
  limit = 4
): Promise<DocSnippet[]> {
  let hits: ChunkHit[] = [];
  if (settings.capabilities.knowledge_base && provider) {
    const started = Date.now();
    try {
      const { vectors, usage } = await provider.embed([query.slice(0, 2000)], {
        model: settings.embedding_model,
        task: 'RETRIEVAL_QUERY',
        dimensions: EMBEDDING_DIMENSIONS,
      });
      await logAuxUsage(admin, {
        requestType: 'embedding',
        ...usageCtx,
        provider: settings.provider,
        model: settings.embedding_model,
        inputTokens: usage.inputTokens,
        outputTokens: 0,
        durationMs: Date.now() - started,
        status: 'success',
        pricing,
      });
      const { data, error } = await admin.rpc('ai_match_knowledge', {
        query_embedding: JSON.stringify(vectors[0]),
        p_organization_id: usageCtx.organizationId,
        p_match_count: limit,
      });
      if (error) throw new Error(error.message);
      hits = ((data ?? []) as (ChunkHit & { similarity: number })[]).filter((h) => h.similarity >= MIN_SIMILARITY);
    } catch (error) {
      console.error('[ai] vector search unavailable:', error instanceof Error ? error.message : error);
    }
    if (!hits.length) hits = await keywordSearch(admin, usageCtx.organizationId, query, limit);
  }
  const snippets = toSnippets(hits);
  if (snippets.length < 2) {
    const seen = new Set(snippets.map((s) => s.title));
    for (const doc of searchBuiltinDocs(query, limit)) {
      if (!seen.has(doc.title)) snippets.push({ title: doc.title, content: doc.content, module: doc.module, scope: 'platform' });
    }
  }
  return snippets.slice(0, limit);
}

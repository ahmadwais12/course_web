import { NextResponse } from 'next/server';
import { auditAIChange } from '@/lib/ai/admin-access';
import { AIError } from '@/lib/ai/errors';
import { aiErrorResponse } from '@/lib/ai/http';
import { MAX_UPLOAD_BYTES, ingestDocument, isSupportedUpload, listDocuments } from '@/lib/ai/knowledge';
import { resolveKnowledgeScope } from '@/lib/ai/knowledge-access';
import { isAIModule } from '@/lib/ai/modules';
import { getAIProvider } from '@/lib/ai/providers';
import { loadGlobalSettings, loadPricing } from '@/lib/ai/settings';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Query: scope=global|organization (default organization). */
export async function GET(request: Request) {
  try {
    const scope = new URL(request.url).searchParams.get('scope');
    const { admin, tenantId } = await resolveKnowledgeScope(scope);
    return NextResponse.json({ data: await listDocuments(admin, tenantId) });
  } catch (error) {
    return aiErrorResponse(error, 'ai/knowledge');
  }
}

/** multipart/form-data: scope, title, module?, language?, and either file (PDF/TXT/MD/CSV/JSON) or text. */
export async function POST(request: Request) {
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new AIError('invalid_input', 'Expected multipart form data');
    }
    const { ctx, admin, tenantId } = await resolveKnowledgeScope(String(form.get('scope') ?? '') || null);
    const settings = await loadGlobalSettings(admin);
    const pricing = await loadPricing(admin);
    const provider = getAIProvider(settings);

    const file = form.get('file');
    const text = String(form.get('text') ?? '').trim();
    const moduleValue = String(form.get('module') ?? '');
    const language = String(form.get('language') ?? '');
    let title = String(form.get('title') ?? '').trim();

    let filePayload: { base64: string; mimeType: string; fileName: string; sizeBytes: number } | undefined;
    if (file && typeof file === 'object' && 'arrayBuffer' in file && (file as File).size > 0) {
      const f = file as File;
      if (f.size > MAX_UPLOAD_BYTES) throw new AIError('invalid_input', 'File is larger than 10 MB');
      const fileName = f.name.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 150);
      const mimeType = f.type || (/\.pdf$/i.test(fileName) ? 'application/pdf' : 'text/plain');
      if (!isSupportedUpload(mimeType, fileName)) {
        throw new AIError('invalid_input', 'Unsupported file type. Upload PDF, TXT, Markdown, CSV, or JSON.');
      }
      filePayload = {
        base64: Buffer.from(await f.arrayBuffer()).toString('base64'),
        mimeType,
        fileName,
        sizeBytes: f.size,
      };
      title ||= fileName;
    } else if (!text) {
      throw new AIError('invalid_input', 'Provide a file or text content');
    }
    if (!title) throw new AIError('invalid_input', 'Title is required');

    const doc = await ingestDocument(admin, provider, settings, pricing, {
      tenantId,
      title,
      sourceType: filePayload ? 'upload' : 'text',
      module: isAIModule(moduleValue) ? moduleValue : null,
      language: ['en', 'dr', 'ps'].includes(language) ? language : null,
      text: filePayload ? undefined : text,
      file: filePayload,
      uploadedBy: ctx.userId,
      usageCtx: { tenantId: ctx.tenantId, organizationId: ctx.organizationId, userId: ctx.userId },
    });
    await auditAIChange(admin, ctx, request, {
      action: 'ai.knowledge.uploaded',
      entityType: 'ai_knowledge_documents',
      entityId: doc.id,
      details: { title: doc.title, scope: tenantId ? 'organization' : 'global', chunks: doc.chunk_count, embedding: doc.embedding_status },
    });
    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (error) {
    return aiErrorResponse(error, 'ai/knowledge');
  }
}

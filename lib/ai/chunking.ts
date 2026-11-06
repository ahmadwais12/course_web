/** Paragraph-aware document chunking for the knowledge base. */

export type ChunkOptions = { maxChars?: number; overlap?: number; maxChunks?: number };

function splitLong(paragraph: string, maxChars: number): string[] {
  if (paragraph.length <= maxChars) return [paragraph];
  const sentences = paragraph.match(/[^.!?؟\n]+[.!?؟]*\s*/g) ?? [paragraph];
  const parts: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) parts.push(current.trim());
      current = '';
      for (let i = 0; i < sentence.length; i += maxChars) parts.push(sentence.slice(i, i + maxChars).trim());
      continue;
    }
    if ((current + sentence).length > maxChars) {
      parts.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

function tail(text: string, overlap: number) {
  if (overlap <= 0 || text.length <= overlap) return '';
  const slice = text.slice(-overlap);
  const space = slice.indexOf(' ');
  return space >= 0 ? slice.slice(space + 1) : slice;
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const maxChars = options.maxChars ?? 1200;
  const overlap = Math.min(options.overlap ?? 150, Math.floor(maxChars / 3));
  const maxChunks = options.maxChunks ?? 400;

  const paragraphs = text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .flatMap((p) => splitLong(p, maxChars - overlap));

  const chunks: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      if (chunks.length >= maxChunks) return chunks;
      const carry = tail(current, overlap);
      current = carry ? `${carry}\n\n${paragraph}` : paragraph;
    } else {
      current = candidate;
    }
  }
  if (current && chunks.length < maxChunks) chunks.push(current);
  return chunks;
}

/** Rough token estimate (≈4 characters per token) for chunk metadata only — never for billing. */
export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

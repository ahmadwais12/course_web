/** Input/output hardening shared by the AI service, tools, and renderer. */

const SECRET_PATTERNS: RegExp[] = [
  /AIza[0-9A-Za-z_-]{30,}/g, // Google API keys
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWTs (Supabase keys)
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\b(?:postgres|postgresql|mysql):\/\/[^\s'"]+/gi,
];

export function redactSecrets(text: string): string {
  let out = text;
  for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, '[redacted]');
  return out;
}

export function containsSecret(text: string): boolean {
  return SECRET_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    const hit = pattern.test(text);
    pattern.lastIndex = 0;
    return hit;
  });
}

/** Strip control characters, normalize whitespace, and enforce the size limit. */
export function sanitizeUserInput(text: unknown, maxChars: number): { text: string; tooLong: boolean } {
  const raw = typeof text === 'string' ? text : '';
  const cleaned = raw
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
  return { text: cleaned.slice(0, maxChars), tooLong: cleaned.length > maxChars };
}

/**
 * Wrap retrieved documentation so the model treats it as reference data only.
 * Delimiters inside the content are removed so a document cannot close the wrapper early.
 */
export function wrapUntrustedDocument(index: number, title: string, content: string): string {
  const safeTitle = title.replace(/[<>"\n]/g, ' ').slice(0, 160);
  const safeContent = content.replace(/<\/?\s*(?:source|document)[^>]*>/gi, ' ');
  return `<source id="${index}" title="${safeTitle}">\n${safeContent}\n</source>`;
}

/** Only same-origin app paths — no protocols, protocol-relative URLs, or odd characters. */
export function isSafeInternalHref(href: unknown): href is string {
  if (typeof href !== 'string') return false;
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  return /^\/[A-Za-z0-9\-_/]*(\?[A-Za-z0-9=&_\-.%]*)?$/.test(href);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

/** Client-generated idempotency key: 8–64 URL-safe characters. */
export function normalizeRequestId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null;
}

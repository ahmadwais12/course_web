/**
 * Minimal, safe Markdown → AST. Output is rendered by React as text nodes (never HTML),
 * and links are kept only for same-origin app paths.
 */
import { isSafeInternalHref } from '@/lib/ai/security';

export type MdInline =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: MdInline[] }
  | { type: 'italic'; children: MdInline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: MdInline[] }
  | { type: 'cite'; index: number };

export type MdBlock =
  | { type: 'heading'; level: 1 | 2 | 3; children: MdInline[] }
  | { type: 'paragraph'; children: MdInline[] }
  | { type: 'list'; ordered: boolean; items: MdInline[][] }
  | { type: 'table'; header: MdInline[][]; rows: MdInline[][][] }
  | { type: 'code'; text: string }
  | { type: 'quote'; children: MdInline[] }
  | { type: 'hr' };

const INLINE = /(\*\*[^*]+?\*\*|__[^_]+?__|`[^`]+?`|\[[^\]]+?\]\([^)\s]+?\)|\[\d{1,2}\]|\*[^*\s][^*]*?\*|_[^_\s][^_]*?_)/;

export function parseInline(text: string, depth = 0): MdInline[] {
  if (depth > 3) return [{ type: 'text', text }];
  const out: MdInline[] = [];
  let rest = text;
  while (rest.length) {
    const match = INLINE.exec(rest);
    if (!match) {
      out.push({ type: 'text', text: rest });
      break;
    }
    if (match.index > 0) out.push({ type: 'text', text: rest.slice(0, match.index) });
    const token = match[0];
    if (token.startsWith('**') || token.startsWith('__')) {
      out.push({ type: 'bold', children: parseInline(token.slice(2, -2), depth + 1) });
    } else if (token.startsWith('`')) {
      out.push({ type: 'code', text: token.slice(1, -1) });
    } else if (/^\[\d{1,2}\]$/.test(token)) {
      out.push({ type: 'cite', index: Number(token.slice(1, -1)) });
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      const label = linkMatch?.[1] ?? token;
      const href = linkMatch?.[2] ?? '';
      if (isSafeInternalHref(href)) out.push({ type: 'link', href, children: parseInline(label, depth + 1) });
      else out.push(...parseInline(label, depth + 1));
    } else {
      out.push({ type: 'italic', children: parseInline(token.slice(1, -1), depth + 1) });
    }
    rest = rest.slice(match.index + token.length);
  }
  return out;
}

function splitRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

export function parseMarkdown(source: string, maxBlocks = 200): MdBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MdBlock[] = [];
  let i = 0;
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', children: parseInline(paragraph.join(' ')) });
      paragraph = [];
    }
  };

  while (i < lines.length && blocks.length < maxBlocks) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flush();
      i++;
      continue;
    }
    if (trimmed.startsWith('```')) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      i++;
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flush();
      const level = Math.min(heading[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: 'heading', level, children: parseInline(heading[2]) });
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flush();
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }
    if (trimmed.includes('|') && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      flush();
      const header = splitRow(trimmed).map((c) => parseInline(c));
      i += 2;
      const rows: MdInline[][][] = [];
      while (i < lines.length && lines[i].trim().includes('|') && rows.length < 100) {
        rows.push(splitRow(lines[i]).map((c) => parseInline(c)));
        i++;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }
    const bullet = /^([-*+]|\d{1,3}[.)])\s+(.*)$/.exec(trimmed);
    if (bullet) {
      flush();
      const ordered = /\d/.test(bullet[1]);
      const items: MdInline[][] = [];
      while (i < lines.length) {
        const m = /^\s*([-*+]|\d{1,3}[.)])\s+(.*)$/.exec(lines[i]);
        if (!m || /\d/.test(m[1]) !== ordered) break;
        items.push(parseInline(m[2]));
        i++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }
    if (trimmed.startsWith('>')) {
      flush();
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) quote.push(lines[i++].trim().replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', children: parseInline(quote.join(' ')) });
      continue;
    }
    paragraph.push(trimmed);
    i++;
  }
  flush();
  return blocks;
}

'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { DataTable, type DataColumn } from '@/components/ports';
import { parseMarkdown, type MdBlock, type MdInline } from '@/lib/ai/markdown';

function plainText(nodes: MdInline[]): string {
  return nodes
    .map((n) => (n.type === 'text' || n.type === 'code' ? n.text : n.type === 'cite' ? `[${n.index}]` : plainText(n.children)))
    .join('');
}

/** Renders assistant Markdown as React text nodes — no raw HTML is ever injected. */
function Inline({ nodes }: { nodes: MdInline[] }) {
  return (
    <>
      {nodes.map((node, i) => {
        switch (node.type) {
          case 'text':
            return <React.Fragment key={i}>{node.text}</React.Fragment>;
          case 'bold':
            return (
              <strong key={i} className="font-semibold">
                <Inline nodes={node.children} />
              </strong>
            );
          case 'italic':
            return (
              <em key={i}>
                <Inline nodes={node.children} />
              </em>
            );
          case 'code':
            return (
              <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
                {node.text}
              </code>
            );
          case 'link':
            return (
              <Link key={i} href={node.href} className="font-medium text-primary underline underline-offset-2">
                <Inline nodes={node.children} />
              </Link>
            );
          case 'cite':
            return (
              <sup key={i} className="mx-0.5 rounded bg-primary/10 px-1 text-[10px] font-semibold text-primary">
                {node.index}
              </sup>
            );
        }
      })}
    </>
  );
}

function Block({ block }: { block: MdBlock }) {
  switch (block.type) {
    case 'heading': {
      const cls = block.level === 1 ? 'text-base font-semibold' : 'text-sm font-semibold';
      return (
        <p className={`${cls} mt-2 first:mt-0`}>
          <Inline nodes={block.children} />
        </p>
      );
    }
    case 'paragraph':
      return (
        <p className="leading-relaxed">
          <Inline nodes={block.children} />
        </p>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className={`${block.ordered ? 'list-decimal' : 'list-disc'} space-y-1 ps-5`}>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline nodes={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'table': {
      const columns: DataColumn<MdInline[][]>[] = block.header.map((cell, i) => ({
        key: `c${i}`,
        header: plainText(cell),
        render: (row) => <Inline nodes={row[i] ?? []} />,
      }));
      return (
        <div className="overflow-hidden rounded-lg border border-border">
          <DataTable columns={columns} rows={block.rows} rowKey={(_, i) => String(i)} emptyMessage="—" />
        </div>
      );
    }
    case 'code':
      return (
        <pre className="overflow-x-auto rounded-lg bg-muted p-2.5 font-mono text-xs" dir="ltr">
          {block.text}
        </pre>
      );
    case 'quote':
      return (
        <blockquote className="border-s-2 border-border ps-3 text-muted-foreground">
          <Inline nodes={block.children} />
        </blockquote>
      );
    case 'hr':
      return <hr className="border-border" />;
  }
}

export default function AIMarkdown({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);
  return (
    <div className="space-y-2 text-sm">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

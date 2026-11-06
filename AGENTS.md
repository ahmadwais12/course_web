# DreamFlow course_web — Agent instructions

## Always: shared Ports UI on every page

Whenever you **create** or **edit** a page under `app/`, use the shared kit from `@/components/ports`. Do not invent a new table, search bar, filter bar, button, input, dialog, or pagination style.

### Use these components

- Lists: `ListPageShell` + `useListQuery` (search, filters, table, pagination)
- Tables: `DataTable` / `DataColumn` (never a raw `<table>` on a list page)
- Search / filters: `Filter` (one Filters button → dialog with all options), `SearchBar`, `Dropdown` (always searchable). Prefer `Filter` / `ListPageShell`; avoid ad-hoc filter bars.
- Forms: `InputField`, `TextAreaField`, `PasswordField`, `Dropdown`, `MultiSelectField`, `PortButton`
- Dialogs: `FormDialog` + `FormDialogFooter`
- Row actions: `RowActions`
- Status / empty / errors: `StatusChip`, `EmptyState`, `ErrorBanner`
- Layout: `PageHeader`, `SectionPanel`, `StatCard`, `Pagination`

### Do not

- Use raw `<table>`, ad-hoc search inputs, or `emis-btn-primary` / custom modal markup on dashboard pages
- Mix a one-off filter card with a custom table — wrap the page in `ListPageShell`
- Change button colors away from first-commit Ports (`PortButton` primary `#88b6ff`)

## Always: SEO for every page

Whenever you **create** or **edit** a Next.js page under `app/`, you **must** finish SEO before marking the work done. Do not ship UI-only pages without metadata.

### Checklist (run every time)

1. **Inspect first** — Read `lib/seo.ts`, `lib/seo-pages.ts`, and nearby `layout.tsx` patterns.
2. **Add route SEO layout** — For each new route segment, add or update a colocated `layout.tsx` that exports metadata (see templates below).
3. **Unique metadata** — Title, description, canonical path, Open Graph, Twitter, and robots. Use helpers from `@/lib/seo`.
4. **Private vs public**
   - Authenticated / dashboard routes (`app/(dashboard)/**`) → `privateAppPageMetadata(...)` (`noindex`, `nofollow`).
   - Public marketing pages → `buildPageMetadata(...)` with `noIndex: false`, and add the URL to `app/sitemap.ts`.
5. **Catalog private routes** — Add a `{ path, title, description }` entry to `PRIVATE_APP_PAGES` in `lib/seo-pages.ts` (feeds `app/robots.ts` disallow).
6. **Dynamic routes** — Add `generateMetadata` in `app/.../[param]/layout.tsx` (canonical includes the param). Prefer a real 404 for bad ids when data is missing on the server.
7. **Robots prefixes** — If you introduce a new private top-level segment (e.g. `/inventory/...`), add `/inventory/` to the prefix list in `app/robots.ts`.
8. **Never** put private app URLs in `sitemap.ts`. Never use localhost as a production canonical when `NEXT_PUBLIC_SITE_URL` is set.

### Private page layout template

```tsx
import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Page Title',
  'One clear sentence describing this page.',
  '/exact/path'
);

export default function PageSeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

### Dynamic private layout template

```tsx
import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return privateAppPageMetadata(
    'Page Title',
    'One clear sentence describing this page.',
    `/parent/${id}`
  );
}

export default function PageSeoLayout({ children }: Props) {
  return children;
}
```

### After adding pages — quick verify

- [ ] Every new `page.tsx` has a sibling or segment `layout.tsx` with metadata
- [ ] Static private paths listed in `lib/seo-pages.ts`
- [ ] Public paths only (if any) listed in `app/sitemap.ts`
- [ ] New private prefixes reflected in `app/robots.ts` when needed

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DreamFlow AI Business Assistant (Google Gemini)

Implementation of `AI_implemetation.md`: one shared, platform-managed Gemini assistant for every
organization, with strict tenant isolation, role-based data access, per-plan quotas, usage
tracking, a RAG knowledge base, and Super Admin / organization admin controls.

AI **write actions (spec Phase 11) are not implemented** — the assistant is read-only.

---

## 1. Deploy checklist

1. **Run the migration** in the Supabase SQL editor (no DB connection was available while building):
   `supabase/migrations/20261105_ai_assistant.sql` (idempotent, safe to re-run).
   Until it runs, every AI endpoint answers with `ai_tables_missing` and the floating assistant stays hidden.
2. **Set the server environment variable** and restart the app:

   | Variable | Required | Notes |
   | --- | --- | --- |
   | `GEMINI_API_KEY` | yes | Google AI Studio key. Server-only — never prefix with `NEXT_PUBLIC_`. `GOOGLE_GEMINI_API_KEY` is accepted as an alias. |
   | `SUPABASE_SERVICE_ROLE_KEY` | yes (already used by the app) | AI routes use the service-role client **after** their own authorization and always add a tenant filter. |

   The key is read from `process.env` on each request. It is never stored in the database, logged,
   or returned by any API — the admin UI only shows "API key configured: yes/no".
3. Sign in as a Super Admin → **System → AI Management**:
   - Provider tab → **Test connection** (chat + embeddings).
   - Knowledge Base tab → **Re-index built-in guides** (creates embeddings for the built-in help).
   - Plans & Pricing tab → confirm limits and current Google prices.
4. Optional: schedule `POST /api/ai/admin/retention` (or click *Apply retention now*) to purge old conversations.

**Rollback:** `supabase/migrations/rollback/20261105_ai_assistant_down.sql` drops every AI table and function
(conversation history and usage logs are lost). Remove `GEMINI_API_KEY` to disable the provider without touching data.

---

## 2. Architecture

```
Browser (widget / AI page / admin pages)
   │  fetch /api/ai/*   (no keys, no tenant ids trusted from the client)
   ▼
Route handler ──► resolveAIContext()  (Supabase auth cookie → users/tenants/roles/abilities)
   │                 tenantScope = own tenant (+ branches for central admins), organizationId = billing org
   ├─► resolveAccess()   blockers: role, platform switch, key, org switch, allowed roles, subscription, modules
   ├─► reserveQuota()    ai_reserve_quota RPC — advisory lock, idempotent on request_id
   ├─► Gemini generateContent + function calling (max 4 rounds × 4 calls, last round forced to text)
   │      └─► executeTool()  re-checks module permission, validates args, scoped() tenant filter
   ├─► searchKnowledge()  pgvector → keyword → built-in guides
   └─► completeUsage() / failUsage()  tokens, estimated cost, duration, error category
```

Key rules enforced in code (not just in the prompt):

- **Tenant isolation** — `scoped()` adds `tenant_id IN (ctx.tenantScope)` to every business query and throws
  for a missing scope. Tool schemas never contain tenant/org/user/branch ids, and `validateArgs()` drops any
  extra keys the model invents. Conversations are filtered by `user_id` + `tenant_id` + `deleted_at IS NULL`.
- **RBAC** — `resolveAllowedModules()` (role defaults OR explicit RBAC abilities, then the organization allow-list
  and platform capabilities). Only permitted tools are declared to the model, and `executeTool()` re-checks.
  Teachers are limited to their own classes/courses. Students and guardians have no access.
- **Inventory** data is platform-scope only, because the inventory store has no tenant column yet.
- **Numbers come only from tools.** Retrieved documents and tool output are wrapped as untrusted data;
  secrets are redacted from model output and from stored/logged text.
- **Financial answers** carry period, currency, scope, and basis (cash basis; "not a verified financial statement").

## 3. Database (migration `20261105_ai_assistant.sql`)

| Table / function | Purpose |
| --- | --- |
| `ai_settings` | Single row: provider, model, embedding model, temperature, tokens, timeout, thinking budget, capabilities, retention. **No API key.** |
| `ai_plan_limits` | Monthly / daily / per-minute limits per plan slug (seeded: free_trial 50/10, basic 500/30, professional 2000/100, enterprise 10000/500 — edit for custom contracts). |
| `ai_tenant_settings` | Per-organization switch, org-admin toggle permission, limit overrides, allowed modules/roles, warning threshold. |
| `ai_model_pricing` | Price per 1M input/output tokens (initial values — verify against Google’s price list). |
| `ai_conversations`, `ai_messages` | History with soft delete, summaries, feedback, response metadata (tools, sources, charts). |
| `ai_usage_logs` | Usage ledger: request id (unique), status reserved/success/failed, tokens, cost, duration, error category. |
| `ai_knowledge_documents`, `ai_knowledge_chunks` | RAG store; `vector(768)` embeddings with HNSW index; `tenant_id NULL` = platform guide. |
| `ai_reserve_quota()` | Atomic, idempotent quota reservation (counts success + recent reserved rows; UTC day/month). |
| `ai_match_knowledge()` | Vector search limited to platform docs + the caller’s organization. |
| `ai_apply_retention()` | Deletes conversations past the retention period. |

RLS is enabled on every AI table. The only client-visible policies let a signed-in user read their own
conversations and messages; everything else (settings, quotas, usage, knowledge) is reachable only through
the server routes.

## 4. API routes (`app/api/ai`)

| Route | Who | Purpose |
| --- | --- | --- |
| `GET status` | staff | Availability, reason, permitted modules, quota, suggestions, admin flags |
| `POST chat` | staff | Send a message (`requestId` for idempotent retries) |
| `GET conversations`, `GET/PATCH/DELETE conversations/[id]` | owner | History list/search/pagination, rename/archive, soft delete |
| `POST messages/[id]/feedback` | owner | Thumbs up/down |
| `GET/PUT org` | org admin | Own organization usage; toggle (if permitted) and allowed roles |
| `GET/POST knowledge`, `DELETE knowledge/[id]` | org admin (organization) / platform admin (global) | Knowledge documents (PDF, TXT, MD, CSV, JSON, or pasted text) |
| `POST knowledge/sync-builtin` | platform admin | Re-index built-in guides |
| `GET/PUT admin/settings`, `POST admin/test` | platform admin | Provider settings and connection test |
| `GET admin/usage` | platform admin | Usage report (date range, organization filter) |
| `GET admin/tenants`, `PUT admin/tenants/[id]` | platform admin | Organization AI settings and limits |
| `GET/PUT admin/plans`, `GET/PUT admin/pricing` | platform admin | Plan limits and model pricing |
| `POST admin/retention` | platform admin | Apply retention now |

Every configuration change is written to the system activity log (`ai.*` actions) with before/after details.

## 5. Business tools (read-only)

| Module | Tools |
| --- | --- |
| Academic | `get_student_count`, `get_student_enrollment_summary`, `get_attendance_summary`, `get_low_attendance_students`, `get_exam_results_summary`, `get_course_enrollment_summary` |
| Admissions | `get_admission_statistics`, `get_pending_admissions` |
| Finance | `get_revenue_summary`, `get_expense_summary`, `get_unpaid_fees`, `get_receivables_summary`, `get_profit_loss_summary` |
| HR / Payroll | `get_employee_count`, `get_employee_attendance`, `get_department_summary`, `get_payroll_summary` |
| Inventory (platform only) | `get_inventory_summary`, `get_low_stock_items`, `get_inventory_valuation` |
| Reports | `get_monthly_business_summary`, `get_branch_comparison` |
| Support | `search_platform_docs` |

## 6. User interface

- **Floating assistant** on every dashboard page (bottom corner, RTL-aware), hidden when the user has no access.
- **AI Assistant page** `/ai-assistant` — history with search, rename, delete; suggestions; copy; feedback; sources; charts.
- **AI Settings** `/ai-assistant/settings` (organization admins) — usage, on/off when permitted, allowed roles, organization documents.
- **AI Management** `/system/ai` (Super Admin) — Provider, Usage, Organizations, Plans & Pricing, Knowledge Base.
- Chat UI is translated (English, Dari, Pashto); admin pages are English like the rest of the admin area.
- Sidebar entries appear only when `/api/ai/status` grants access. SEO: all three pages are `noindex` and listed in
  `lib/seo-pages.ts`; `/ai-assistant/` is disallowed in `robots.ts`.

## 7. Tests

```
npm run test:ai
```

48 tests (`tests/ai`, Node’s built-in runner with native TypeScript): permission matrix, tenant isolation of
every business tool against a recording mock database (admin and teacher, empty and populated data, hostile
`tenant_id` arguments), conversation ownership filters, quota/plan/override/cost calculations, the reservation
RPC contract, secret redaction, prompt-injection wrapping, safe links/markdown, language detection, intent
routing, period resolution, chunking, and Gemini response parsing.

Type check: no new `tsc` errors (the repo has pre-existing errors in unrelated files).

## 8. Known limitations

- The migration must be applied manually; it was not run against the live database from here.
- Answers are returned when complete (no token streaming); the UI shows a thinking indicator.
- Inventory and leads have no tenant column, so those tools are available to platform admins only.
- Profit & loss is a cash-basis estimate from recorded payments and expenses (payroll shown separately), not an accounting statement.
- Usage reports aggregate up to 20,000 log rows per request (a notice appears when truncated).
- Scanned PDFs without a text layer cannot be indexed (Gemini text extraction returns nothing).
- The project’s `.oxlintrc` currently fails to parse (pre-existing); lint was run with a minimal config.
- `lib/supabase/admin.ts` still accepts a `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` fallback (pre-existing). Prefer
  `SUPABASE_SERVICE_ROLE_KEY` so the service key can never be bundled to the browser.

## 9. Phase report

| Phase | Status |
| --- | --- |
| Audit of the existing system | Done — tenancy (central/branch), roles and abilities, sidebar, Ports UI kit, SEO rules |
| Database schema, migration, rollback | Done — run manually (see §1) |
| Provider abstraction + Gemini (chat, function calling, embeddings, PDF text) | Done |
| Tenant/permission context and module RBAC | Done |
| Business data tools (academic, admissions, finance, HR/payroll, inventory, reports) | Done |
| Chat service, conversations, idempotent quota, usage + cost logging, summaries, retention | Done |
| Platform support RAG (built-in guides, org documents, pgvector, citations) | Done |
| Frontend: floating assistant, AI page, markdown, charts, sources, feedback, i18n/RTL | Done |
| Super Admin AI Management and organization AI Settings, audit logging | Done |
| Tests and documentation | Done |
| Phase 11 — AI write actions | **Not implemented** (future work, per spec) |

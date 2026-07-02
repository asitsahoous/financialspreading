# Technical Architecture — Production CL Alpha

**Status:** Draft for review · **Last updated:** 2026-07-02
**Companion documents:** [PRD](PRD.md) · [Workflows & Exceptions](WORKFLOWS_AND_EXCEPTIONS.md) · [Known Issues](KNOWN_ISSUES.md) · [Roadmap](ROADMAP.md)

This document defines the target production architecture and makes **concrete, opinionated technology recommendations** so the plan is buildable, not just aspirational. Each recommendation includes rationale and a swap-out alternative — these are starting points for an architecture review, not locked-in vendor contracts.

---

## 1. Current-state architecture (baseline)

- **Frontend** (`app/`): Vite + React 19 + TypeScript, single ~8,280-line component file ([FinancialSpreadingACOS.tsx](../app/src/acos/FinancialSpreadingACOS.tsx)), state in browser `sessionStorage`, no backend calls in the demo path. Deployed via Netlify ([netlify.toml](../app/netlify.toml)).
- **Backend** (`backend/`): Python LangGraph + FastAPI, 10 agent nodes + 5 human-gate interrupts, SQLite checkpointer locally (Postgres in prod per its own README), deterministic SOP logic when no LLM key is present. **Not currently wired to the frontend.**
- **Persistence:** none beyond the LangGraph checkpointer and browser session storage. No multi-tenant data model, no file storage, no auth.

Production requires: (a) wiring frontend → backend for real, (b) a proper relational data model, (c) real document/OCR/LLM extraction, (d) auth/RBAC/multi-tenancy, (e) notifications, (f) file storage, (g) observability and compliance controls.

## 2. Target architecture (high level)

```
                        ┌─────────────────────────┐
                        │   React SPA (Netlify)    │
                        │  FinancialSpreadingACOS   │  ← split into modules (see §8)
                        └────────────┬─────────────┘
                                     │ HTTPS / REST + SSE
                        ┌────────────▼─────────────┐
                        │   FastAPI gateway (API)   │──── Auth (OIDC/SAML) ─── IdP
                        └────────────┬─────────────┘
                 ┌───────────────────┼───────────────────────┐
                 │                   │                       │
        ┌────────▼───────┐  ┌────────▼────────┐   ┌──────────▼─────────┐
        │ LangGraph case  │  │  Rule engines     │   │ Notification svc   │
        │ graph (existing │  │ (mapping/ratio/   │   │ (email/Slack/SMS)  │
        │ graph.py, agents│  │  risk/metrics)    │   └──────────┬─────────┘
        │ + gates)        │  └────────┬──────────┘              │
        └────────┬────────┘           │                         │
                  │                   │                         │
        ┌─────────▼───────────────────▼─────────────────────────▼───────┐
        │                     PostgreSQL (primary DB)                    │
        │  cases · documents · extraction · mapping/ratio/risk rules ·   │
        │  gates · audit_log · notifications · export/memo templates     │
        └─────────┬────────────────────────────────────────────────────┘
                  │
        ┌─────────▼──────────┐      ┌───────────────────────┐
        │ Object storage (S3/│      │ OCR / Doc Intelligence │
        │ Blob) — source PDFs│◄─────┤ + LLM extraction agent │
        └─────────────────────┘      └───────────────────────┘
```

## 3. Data model (new — the biggest gap)

Everything today lives in `sessionStorage`/hardcoded fixtures. Production needs a real relational schema. Core tables (Postgres):

| Table | Purpose |
|---|---|
| `organizations` | Multi-tenant boundary (lender org) |
| `users`, `roles`, `user_roles` | RBAC — Analyst, Manager, Committee, Risk/Compliance, Admin, Observer |
| `analysts_capacity` | Round-robin assignment pool + max concurrent cases (#1) |
| `cases` | Core case record: borrower, case type, stage, assigned analyst, status |
| `case_documents` | Uploaded/received docs, type, status, source-package link |
| `document_pages` | Page-level split output (#2) with classification + confidence |
| `extraction_items` | Raw extracted line items: label, value(s), period, confidence, bounding box (#3) |
| `key_value_fields` | Structured extraction from supporting forms (#5) |
| `financial_components` | The FC taxonomy (today's static `taxonomy.ts`, becomes DB-backed) |
| `mapping_rules` | Versioned raw→FC mapping rules (#11) |
| `ratio_formulas`, `risk_formulas`, `portfolio_metrics` | Versioned formula definitions (#16/#19/#31) |
| `qualitative_risk_rules` | Configurable non-numeric rules (#20) |
| `validation_exceptions` | Temporal/historical mismatch findings (#14/#15) and mapping/extraction exceptions |
| `gates`, `gate_audit_log` | Gate sign-off state + immutable history (extends existing pattern) |
| `overrides_audit_log` | Field-level corrections (extends existing Trust Inspector override log) |
| `notifications`, `notification_log` | Reminders, dealer requests, delivery status (#7/#8) |
| `export_templates`, `memo_templates` | Saved CSV/memo mapping configs (#23/#26) |

**Recommendation:** PostgreSQL for everything — it's already the backend's documented production target (`backend/README.md`), avoids a second database technology, and gives ACID guarantees the audit trail needs. Add `pgvector` only if/when semantic search over rule explanations or document similarity becomes a requirement — not needed for v1.

## 4. Document extraction / OCR / LLM

This is the highest-risk, highest-value new component (#2, #3, #5, #18, #21).

**Recommendation:** a two-stage pipeline rather than one "magic" extractor:
1. **Layout/OCR stage** — Azure AI Document Intelligence (prebuilt + custom-trained models) or AWS Textract for page classification, table extraction, and bounding-box coordinates. Either is viable; pick based on existing cloud vendor relationship (Iron Mountain DXP context suggests checking their existing Azure/AWS footprint first).
2. **Semantic extraction/mapping stage** — LLM-based agent (the backend already supports `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` per `backend/README.md`) reads the OCR output and produces structured FC-mapped line items with confidence scores, handling label variation ("Net Sales" vs "Total Revenue") that pure OCR can't resolve. **Recommend Claude (Anthropic) as primary** given the existing key support and the backend's LangGraph orchestration, with OpenAI as a documented fallback for redundancy.

This hybrid avoids two failure modes: pure-LLM extraction hallucinating numbers from scanned tables, and pure-OCR extraction failing to normalize label variation across formats — directly addressing requirement #3's "must adapt to different document formats" without infinite per-format custom code.

**Alternative considered:** a specialized financial-spreading OCR vendor (e.g. Ocrolus-class products). Worth an eval spike before committing, since these are purpose-built for exactly this problem (see also the competitor research already in `_index/` — Moody's and Evalueserve both use vendor-grade extraction). Flagged as a build-vs-buy decision for the architecture review, not decided here.

## 5. Auth & identity

**Recommendation:** OIDC/SAML SSO via Auth0 or Okta (Okta preferred if Iron Mountain already standardizes on it for enterprise DXP — confirm during kickoff). RBAC roles (§3) enforced server-side on every FastAPI route, not just hidden in the UI, per PRD §7.

## 6. File storage

**Recommendation:** S3 (or Azure Blob if the OCR vendor choice above lands on Azure, to keep egress local) for source PDFs and generated exports, with lifecycle policies matching the org's document-retention policy. Page-level bounding-box lineage (§3 `document_pages`, `extraction_items`) references these objects by key — never re-uploads/duplicates.

## 7. Security & compliance

- Encryption at rest (DB + object storage) and in transit (TLS everywhere).
- Field-level access logging for PII (SSN last-4, EIN, DUNS) — every read logged, not just writes.
- Audit log (`gate_audit_log`, `overrides_audit_log`, rule-change logs) is **append-only**; no update/delete path, even for admins — implement as an insert-only table with a trigger or application-layer guard.
- GLBA-adjacent data handling policy for borrower financial data; align with whatever compliance framework Iron Mountain DXP already carries (SOC 2 likely, given the enterprise document-management business) rather than starting from scratch.
- Pen test / security review before first production tenant onboarding (see [Roadmap](ROADMAP.md) phase gates).

## 8. Frontend architecture changes

- **Split `FinancialSpreadingACOS.tsx`** (~8,280 lines) into feature modules (Command Center, Cases, Financial Spread, InSight, Agents, Admin/Rules) before adding the ~25 new features into it — continuing to grow one file is itself a production-readiness risk (harder to test, review, and assign ownership).
- Replace `sessionStorage` state with real API calls (React Query or similar for server-state caching) against the FastAPI gateway.
- Add a real-time channel (Server-Sent Events is sufficient for one-directional case/notification updates; avoid full WebSocket infra unless bidirectional live-collaboration is added later) so gate sign-offs, assignments, and notifications reflect across users without manual refresh.
- New Admin surfaces needed: mapping-rule editor (#11/#12), ratio/risk/portfolio-metric formula builders (#16/#19/#20/#31), export/memo template editors (#23/#26), analyst capacity config (#1), notification/reminder config (#7).

## 9. Backend architecture changes

- Wire the existing `graph.py` LangGraph pipeline to the frontend via the FastAPI routes already defined in `backend/api/router.py` — today they exist but aren't called by `app/`.
- Add new node(s)/services for: document splitting (#2), key-value extraction (#5), temporal/historical validation (#14/#15), notification dispatch (#7/#8), and rule-engine evaluation (mapping/ratio/risk/metrics) — these are new capabilities, not just wiring existing nodes.
- Move `SqliteSaver` → `PostgresSaver` per the backend README's own documented production path.
- Scheduled jobs (reminders #7, follow-up escalation #8, portfolio metric recalculation #31/#32): a lightweight scheduler (APScheduler or a managed cron on the hosting platform) is sufficient for v1; revisit Temporal.io only if workflow complexity/retries grow significantly.

## 10. Hosting & deployment

- **Backend:** Fly.io (already the documented recommendation in `backend/README.md`) or AWS ECS/Fargate if standardizing on AWS for the OCR vendor. Keep it boring — this system's complexity should live in the rule engines and extraction pipeline, not in infra choices.
- **Frontend:** keep Netlify (already configured via `app/netlify.toml`) — no reason to change.
- **CI/CD:** add a pipeline that runs frontend typecheck + `test:e2e` (Playwright, already configured) and backend tests on every PR before either of the above deploys.

## 11. Observability

- Structured logging across FastAPI + LangGraph nodes, correlated by `case_id` and `request_id`.
- Error tracking (Sentry-class tool) on both frontend and backend — today's frontend has no error boundary/reporting at all.
- Dashboards on extraction confidence distribution, exception rates, and gate cycle time (feeds PRD §8 success metrics).

## 12. Migration path from prototype

1. Stand up Postgres schema (§3) and auth (§5) — no feature work until this foundation exists, everything downstream depends on it.
2. Wire frontend to backend for the **existing** 5-gate flow first (replace sessionStorage with real API calls, no new features yet) — proves the integration before piling new features on top.
3. Layer in extraction/OCR (§4) behind the existing intake flow.
4. Build the rule-engine admin surfaces (mapping/ratio/risk/metrics) — these unlock the largest cluster of PRD items (#11, #12, #16, #19, #20, #31).
5. Add workflow automation (assignment #1, reminders #7, agentic exception handling #8) last — these depend on the case/notification data model being real and stable.

See [Roadmap](ROADMAP.md) for the full phased sequencing including known-issue remediation interleaved with this migration.

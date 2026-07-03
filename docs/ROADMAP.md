# Implementation Roadmap — CL Alpha Production

**Status:** Draft for review · **Last updated:** 2026-07-02
**Companion documents:** [PRD](PRD.md) · [Technical Architecture](TECHNICAL_ARCHITECTURE.md) · [Workflows & Exceptions](WORKFLOWS_AND_EXCEPTIONS.md) · [Known Issues](KNOWN_ISSUES.md)

Phased by **priority and technical dependency**, not calendar time (team size/velocity unknown — insert dates once resourcing is confirmed). Each phase has an explicit **exit gate**: what must be true before the next phase starts. Known-issue IDs refer to [KNOWN_ISSUES.md](KNOWN_ISSUES.md); PRD item numbers refer to [PRD.md](PRD.md#6-feature-specifications).

---

## Progress

### Checkpoint — 2026-07-03 (session handoff)

**Read this first if you're picking this repo up fresh.** Everything below is committed and pushed to `origin/main`, HEAD is `d851587`, working tree is clean, all 24 Playwright e2e tests pass. See `docs/KNOWN_ISSUES.md`'s Progress log for full narrative detail on every item below (root causes, verification steps, exact commits).

**What's real now** (backend-persisted via FastAPI+LangGraph, survives reload + full backend restart, concurrency-safe) for the Walmart and Northern Retail demo cases:
- Case creation, document intake, Gate 1–5 sign-off (approve/override/reject/table)
- The 6 core mapping fields (Total Assets, Cash & Equivalents, Receivables/net, Long-term Debt, Shareholders Equity, Revenue) — Trust Inspector accept/override persists for real
- Collaborator Avatars show real gate-signer initials
- Credit Memo PDF export produces a genuine PDF (verified `%PDF-1.3` header), with the real case ref in the filename
- `GET /api/v1/portfolio` now scans real cases (via the LangGraph checkpointer) instead of a hardcoded fixture — **but the frontend never calls this endpoint**; Command Center/InSight are still 100% fixture-driven (see "Deliberately deferred" below for why)

**Not yet cut over:** a Supabase Postgres project (`financial-spreading-board`, us-east-1, id `xqygzqedhkgvyqqfreds`) is provisioned for the checkpointer, but its DB password isn't retrievable via API. **Action needed from a human:** get it from the Supabase dashboard (Project Settings → Database → Connection string, or reset it) and paste it into `backend/.env`'s `DATABASE_URL`. Until then, everything above runs on local SQLite (`backend/acos.db`, gitignored) — fully functional for dev/demo, just not the durable production store.

**6 real bugs found and fixed this session** (this was a verification-heavy session — nearly every "wire X to the backend" step surfaced a genuine defect, not just a missing feature):
1. `SqliteSaver`/`PostgresSaver.from_conn_string()` are `@contextmanager` generators — assigning them directly (original code) yields the wrapper object, not a usable saver, crashing startup.
2. `api/router.py` awaited `graph.ainvoke()` (async) against a sync-only checkpointer — every case/gate call raised `NotImplementedError`. Together, (1) and (2) meant **the backend had never actually completed a case end-to-end before this session**, despite looking complete in the code.
3. Gate off-by-one: every gate signature was recorded one gate behind (Sign Gate 2 recorded Gate 1, etc.) because the Walmart happy-path UI skips explicitly signing Gate 1, leaving the backend's LangGraph interrupt cursor one step out of sync with what the UI intended.
4. A concurrent-request race in `sign_gate`/`receive_document`/`override_field`'s read-modify-write pattern — fixed with a per-`case_id` `asyncio.Lock`.
5. A toast race condition: a single reactive effect toasted on *any* backend sync failure, including passive background reconciliation unrelated to whatever the user just clicked — could silently clobber a meaningful action toast. This had been misdiagnosed as e2e flakiness for 2 rounds before being root-caused.
6. A SQLite cursor deadlock in the new Portfolio Sentinel scan — calling `graph.get_state()` while still iterating the `checkpointer.list()` generator shared the same connection and hung the server indefinitely.

**Deliberately deferred, with reasons (not oversights — don't "fix" these without re-reading why):**
- AutoWest/Costco/Target as real cases, and wiring the frontend to the now-real portfolio endpoint — both explicitly documented as intentional demo-breadth shortcuts (`DEMO_WALKTHROUGH.md`). Making them real means authoring brand-new company narratives / would visually empty out the demo (only 1–2 real cases exist vs. the fixture's ~15) — a different kind of task than the fixes above, not a bug.
- Splitting the 8,280-line `app/src/acos/FinancialSpreadingACOS.tsx` — real value, but a mechanical refactor touching every line has a different risk profile (a missed import silently breaks the whole app) than the verified, behavior-preserving fixes above. Don't rush it.
- Real XLSX export, InSight Assist chat, ratio-trend computation from real data — each a net-new small/medium feature, not a fix to something existing.
- Phase 1 (real OCR/LLM extraction) and auth/RBAC — both need a vendor/provider decision **and credentials from the user**, not just implementation time. Don't guess a vendor; ask first.

**Suggested next step if continuing:** the natural, lowest-risk continuation is wiring the InSight tab to real portfolio data *for just Walmart/Northern Retail specifically* (not replacing the full fixture-driven Command Center), since that avoids the "empty demo" problem while still closing real ground. Otherwise, any of the deferred items above are fair game — just confirm the relevant decision (vendor/scope/content) before starting.

## Phase 0 — Foundation (blocks everything else)

Nothing in later phases can be "real" until this lands. This is pure infrastructure — no new user-facing features ship in this phase, but it resolves the most fundamental Known Issues.

**Scope:**
- Postgres schema ([Technical Architecture §3](TECHNICAL_ARCHITECTURE.md#3-data-model-new--the-biggest-gap)): organizations, users/roles, cases, documents, audit tables.
- Auth/RBAC + multi-tenancy (§5).
- File/object storage for source documents (§6).
- Wire the **existing** 5-gate pipeline (already built in `backend/graph/`) to the frontend for real — replace `sessionStorage` with real API calls, no new gate logic, just make the current flow real (per [Technical Architecture §12](TECHNICAL_ARCHITECTURE.md#12-migration-path-from-prototype) step 2).
- Real case creation (no more routing to hardcoded `walmart`/`northern-retail` IDs).
- Error-handling standard implemented app-wide (loading/error/retry states).
- Split `FinancialSpreadingACOS.tsx` into feature modules before piling more code into one file.

**Resolves:** Known Issues P0-1, P0-6, P0-7 (partially — the standard is established here, applied incrementally after).

**Exit gate:** A user can create a real case, upload real documents, and walk it through Gates 1–5 with everything persisted server-side, multi-tenant, and RBAC-enforced. No new PRD features yet — this phase proves the foundation is solid before building on it.

---

## Phase 1 — Real ingestion & extraction

**Scope (PRD items #2, #3, #5):**
- Document splitting/classification pipeline.
- OCR + LLM extraction (hybrid per [Technical Architecture §4](TECHNICAL_ARCHITECTURE.md#4-document-extraction--ocr--llm)) replacing the hardcoded `FIELD_TEMPLATES`.
- Supporting-document key-value extraction into structured fields.
- Real bureau/AML connector integrations, or explicit UI relabeling if those integrations are deferred (don't ship a flag that implies "real" when it isn't).

**Resolves:** Known Issues P0-2, P0-3, P0-5 (note).

**Exit gate:** A real uploaded PDF package (not a fixture) produces extracted, confidence-scored line items with source lineage, feeding the existing Trust Inspector/exceptions UI on real data instead of a scripted demo defect.

**Depends on:** Phase 0 (document storage, case model).

---

## Phase 2 — Rule engines (mapping, ratios, risk, portfolio metrics)

This is the largest cluster of PRD items and the core of "configurable, not hardcoded."

**Scope (PRD items #9, #10, #11, #12, #16, #18, #19, #20, #21, #31, #32):**
- Mapping-rule editor + visual mapping view.
- Extracted-vs-output side-by-side view; full rollup-tree visibility with PDF cell highlighting.
- Ratio formula builder + inline AI ratio explainer.
- Configurable risk-scoring formula engine (replaces the hardcoded 40/35/25 weighting in `decision.py`).
- Configurable qualitative risk rules + agentic categorization.
- Custom portfolio metrics UI + calculated-values table.

**Resolves:** Known Issues P0-4 (decision engine), P1-4 (hardcoded ratio trends — once real formulas exist, trends compute from them).

**Exit gate:** An admin can define a new ratio or risk formula through the UI, with zero code changes, and see it flow into a live case's Risk stage and Gate 3 decision.

**Depends on:** Phase 1 (rule engines need real extracted FCs to operate on, not fixtures).

---

## Phase 3 — Workflow automation

**Scope (PRD items #1, #7, #8, and validation #14, #15):**
- Auto case-assignment (round-robin + capacity).
- Proactive reminders/notifications infrastructure (in-app + email, extensible to Slack/Teams).
- Agentic ingestion exception handling (auto-drafted dealer emails, reply matching, escalation).
- Temporal and historical data mismatch validation checks.

**Resolves:** Known Issues P1-9 ("assigned"/"notification queued" toasts become real), contributes to closing P1-6 items that are notification-shaped (Escalate to Risk Officer, Assign reviewer).

**Exit gate:** A case with a missing document triggers a real, tracked dealer email without analyst intervention (or with review-queue approval per org setting), and a late recurring statement triggers a real reminder — both visible in the notification log, not just a toast.

**Depends on:** Phase 0 (user/case model), Phase 1 (extraction needed to detect "extraction failed" exceptions that trigger #8).

---

## Phase 4 — Reporting & dashboards

**Scope (PRD items #22, #23, #26, #28, #29, #30):**
- Template-based credit memo engine (placeholders only, pixel-perfect template) with real PDF/DOCX export.
- Custom CSV/system export with cell-level mapping.
- Case-level, time-series, and portfolio-level dashboards reading from the real calculated-values table (Phase 2).

**Resolves:** Known Issues P1-1 (PDF export), P1-2 (Excel export), P1-5 (static Portfolio Sentinel fixtures).

**Exit gate:** Committee reviews a memo generated from a real template with real data; portfolio dashboard reflects the actual set of active cases (not 4 hardcoded borrowers); a CSV export round-trips correctly into a downstream accounting system test import.

**Depends on:** Phase 2 (ratios/risk scores feed the memo and dashboards), Phase 0 (real case data at portfolio scale).

---

## Phase 5 — Cleanup, polish & launch readiness

**Scope:**
- Close remaining [Known Issues](KNOWN_ISSUES.md) P1/P2 items not already resolved by feature phases above (toast-only menu actions without a clear PRD home — view document, re-classify document, print preview, view older recommendations; collaborator presence wired to real assignment data; correct or implement the README's LLM-branch claim in `mapping.py`/`decision.py`).
- Security review / pen test ([Technical Architecture §7](TECHNICAL_ARCHITECTURE.md#7-security--compliance)).
- Observability dashboards live (extraction confidence, exception rates, gate cycle time — [PRD §8](PRD.md#8-success-metrics)).
- Load/performance testing at expected portfolio scale.
- Full regression of the Playwright e2e suite (`app/`'s existing `test:e2e`) expanded to cover every new workflow's happy + exception paths from [Workflows & Exceptions](WORKFLOWS_AND_EXCEPTIONS.md).

**Exit gate:** Zero P0/P1 items remain in [Known Issues](KNOWN_ISSUES.md); security review passed; e2e suite covers all 25 PRD items' happy and primary exception paths.

---

## Dependency graph (summary)

```
Phase 0 (Foundation)
   │
   ├──► Phase 1 (Ingestion & Extraction)
   │        │
   │        ▼
   │    Phase 2 (Rule Engines) ──────┐
   │        │                        │
   │        ▼                        ▼
   ├──► Phase 3 (Workflow Automation)  Phase 4 (Reporting & Dashboards)
   │        │                        │
   │        └───────────┬────────────┘
   │                     ▼
   └──────────────► Phase 5 (Cleanup & Launch Readiness)
```

Phases 3 and 4 can run in parallel once Phases 0–2 are complete, since neither blocks the other directly — sequence them based on team capacity/priority rather than a hard dependency.

## What NOT to do

- Don't start Phase 2's rule engines against fixture data "to move faster" — it produces engines validated against numbers that will change shape once real extraction (Phase 1) lands, likely requiring rework.
- Don't ship Phase 3's agentic dealer-email feature before Phase 0's notification/audit infrastructure exists — an agent sending real emails with no delivery tracking or audit trail is a compliance risk, not a shortcut.
- Don't treat [Known Issues](KNOWN_ISSUES.md) P0 items as "later polish" — they're the reason the current build is a demo rather than a product; everything in Phases 1–4 assumes they're already fixed.

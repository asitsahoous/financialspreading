# Implementation Roadmap — CL Alpha Production

**Status:** Draft for review · **Last updated:** 2026-07-02
**Companion documents:** [PRD](PRD.md) · [Technical Architecture](TECHNICAL_ARCHITECTURE.md) · [Workflows & Exceptions](WORKFLOWS_AND_EXCEPTIONS.md) · [Known Issues](KNOWN_ISSUES.md)

Phased by **priority and technical dependency**, not calendar time (team size/velocity unknown — insert dates once resourcing is confirmed). Each phase has an explicit **exit gate**: what must be true before the next phase starts. Known-issue IDs refer to [KNOWN_ISSUES.md](KNOWN_ISSUES.md); PRD item numbers refer to [PRD.md](PRD.md#6-feature-specifications).

---

## Progress

**2026-07-02:** A narrowed slice of Phase 0 shipped — Gate 1–5 sign-off for the Walmart and Northern Retail demo cases is now real (backend-persisted via a provisioned Supabase Postgres project, survives reload/restart), and 3 previously-unknown backend bugs were found and fixed in the process (the backend had never actually completed a case end-to-end before — see [KNOWN_ISSUES.md Progress log](KNOWN_ISSUES.md#progress-log) for detail). Document intake, mapping/exceptions, overrides, Gate 5 decline/table, and the full Postgres data model (§3 below) remain as originally scoped — not yet started. Document-schema reconciliation (frontend fixture doc names vs. backend's fixed SOP manifest) is a newly-identified prerequisite for wiring document intake, added to this phase's remaining scope.

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

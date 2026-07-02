# Product Requirements Document — Commercial Lending Alpha (Production)

**Status:** Draft for review · **Owner:** TBD · **Last updated:** 2026-07-02
**Scope:** Turns the current `app/` + `backend/` prototype (session-scoped, deterministic, single-user demo) into a production system covering all 25 items in [PRODUCT_REQUIREMENTS.md](../PRODUCT_REQUIREMENTS.md). Companion documents: [Technical Architecture](TECHNICAL_ARCHITECTURE.md) · [Workflows & Exceptions](WORKFLOWS_AND_EXCEPTIONS.md) · [Known Issues](KNOWN_ISSUES.md) · [Roadmap](ROADMAP.md).

---

## 1. Purpose & vision

Iron Mountain DXP Commercial Lending ("CL Alpha") is an agentic credit-operating system that ingests dealership/commercial borrower financial packages, extracts and normalizes financial statements, maps them to a standard chart of accounts, validates and risk-scores them, and drives a 5-gate human-in-the-loop approval workflow to a credit decision — with full audit lineage from source PDF cell to final memo number.

The existing prototype proves the **UX and trust model** (gates, lineage, Trust Inspector, health/ratio views) on 4 scripted borrowers with hardcoded/deterministic data. This PRD defines what's required to make every one of those interactions **real**: real multi-tenant case data, real extraction, real configurable mapping/risk/ratio rules, real notifications and case assignment, and a real audit-grade backend.

## 2. Personas

| Persona | Needs |
|---|---|
| **Credit Analyst** | Works a queue of assigned cases, resolves exceptions, signs gates, requests missing docs from dealers |
| **Portfolio / Credit Manager** | Oversees analyst workload, portfolio-level risk and covenant exposure, reassigns cases |
| **Credit Committee Member** | Reviews credit memos, approves/declines/tables decisions at Gate 5 |
| **Compliance / Risk Officer** | Audits trails, overrides, exception handling; configures qualitative risk rules and validation policy |
| **Dealer / Borrower Contact** | Receives requests for missing documents, uploads statements, gets status updates (external-facing, no app login required for v1) |
| **System Admin / RevOps** | Configures mapping rules, ratio formulas, portfolio metrics, integrations, user roles |

## 3. Current-state summary

See [PRODUCT_REQUIREMENTS.md](../PRODUCT_REQUIREMENTS.md) for the full coverage table. In short: gates/lineage/ratios/health exist but are **fixed logic on 4 hardcoded borrowers with browser-local, single-user state**. Nothing here is multi-tenant, persisted server-side, or backed by real extraction/LLM calls in the frontend path.

## 4. Production goals

1. Every button and workflow in the app either does something real or is explicitly removed — no dead-end demo affordances (see [Known Issues](KNOWN_ISSUES.md)).
2. All 25 backlog items shipped as usable features with defined acceptance criteria (this document).
3. Case data, mapping rules, ratio formulas, risk rules, and audit trail persist server-side, are multi-tenant, and survive across sessions/devices.
4. Every exception path (missing data, extraction failure, validation mismatch, gate rejection, integration failure) has a defined recovery flow — no silent failures or unrecoverable dead ends.
5. System passes a security/compliance review appropriate for financial/PII data (see [Technical Architecture §7](TECHNICAL_ARCHITECTURE.md)).

## 5. Non-goals (v1 production)

- Native mobile app (responsive web only)
- Automated loan funding/disbursement (this system stops at the credit decision)
- Direct integration into core banking/loan origination systems beyond CSV/system export (item #26) — deeper LOS integration is a future phase
- Dealer-facing self-service portal beyond document upload + status (full dealer portal is out of scope for v1)

---

## 6. Feature specifications

Each item below carries: **User story**, **Acceptance criteria** (Given/When/Then), **Exceptions & edge cases**, **Dependencies**. Sl No matches [PRODUCT_REQUIREMENTS.md](../PRODUCT_REQUIREMENTS.md).

### 6.1 Workflow epic

#### #1 — Auto assignment of case (MVP)
**User story:** As a Portfolio Manager, when a new case is created, it is automatically assigned to an available analyst so no case sits unowned.

**Acceptance criteria:**
- Given a new case is created (via intake API or UI), when no analyst is manually specified, then the system assigns it to an analyst using round-robin across the pool of analysts marked "available" for that case's business line.
- Given an analyst is at their configured max concurrent-case limit, when the round-robin reaches them, then they are skipped and the next available analyst is assigned.
- Given all analysts are at capacity, when a new case arrives, then it is queued as "Unassigned — capacity" and a manager notification fires.
- A manager can manually reassign any case at any time; reassignment is logged to the audit trail with actor, old owner, new owner, reason.

**Exceptions:** No analysts configured for the business line → case goes to a default "Unassigned" queue with a blocking banner for admins. Analyst goes on leave mid-case → manager gets a "reassign" prompt, case is not auto-reassigned without confirmation (avoids losing case context silently).

**Dependencies:** User/role model, analyst capacity config (Technical Architecture §3).

#### #7 — Proactive reminders & notifications (MVP)
**User story:** As an analyst, I get notified before/when a dealer's monthly or quarterly financial statement is late, so I don't have to manually track due dates.

**Acceptance criteria:**
- Given a case has a defined reporting cadence (monthly/quarterly) and a due date, when the due date is T-3 days out and the document hasn't been received, then a reminder notification is sent to the assigned analyst and, if configured, to the dealer contact.
- Given the due date passes with no document, when the daily reminder job runs, then the case is flagged "Overdue" on Command Center and a second-tier notification (e.g. to the manager) fires after a configurable grace period.
- Notifications delivered via in-app notification center + email at minimum; Slack/Teams webhook as a configurable channel.
- Users can configure per-case or per-portfolio reminder cadence and channels.

**Exceptions:** Dealer has no contact/email on file → reminder is analyst-only with a banner "no dealer contact configured — add one to enable dealer reminders." Notification delivery failure (bounced email) → retried with backoff, then surfaced in-app as "delivery failed" rather than silently dropped.

**Dependencies:** Notification service, scheduled job runner, dealer contact data model.

#### #8 — Agentic ingestion exception handling (MVP)
**User story:** As an analyst, when a document is missing or fails extraction, the system automatically drafts and sends (or queues for my approval) an email to the dealer requesting exactly what's needed, instead of me writing it manually.

**Acceptance criteria:**
- Given a document is marked missing at intake or fails extraction (e.g. unreadable scan, wrong document type), when the exception is detected, then an agent drafts a dealer-facing email naming the specific document(s)/pages needed, in plain language.
- Given the org's automation setting is "auto-send," when the draft is generated, then it is sent immediately and logged; given the setting is "review required," then it is queued in an analyst approval inbox before sending.
- The system tracks the outbound request and matches the dealer's reply/upload back to the originating exception, closing the loop automatically when the document is received.
- If no response within the configured SLA, an automatic follow-up (with escalating tone/CC to manager) is sent, up to a configurable max number of follow-ups, after which it's escalated to the analyst for manual handling.

**Exceptions:** Extraction fails repeatedly on a resubmitted document → after N failures, stop auto-requesting and hand off to analyst with the failure reason, rather than looping the dealer indefinitely. Dealer replies with an unrelated attachment → agent should not silently mis-file it; low-confidence document-type matches route to analyst review.

**Dependencies:** Email send/receive integration, document-type classifier, case-exception data model, approval-queue UI.

### 6.2 Ingestion / Extraction epic

#### #2 — FS Split and Select (POC)
**User story:** As an analyst, I upload a full document package (e.g. a 200-page loan package) and the system automatically finds and extracts just the financial statement pages, so I don't have to manually locate them.

**Acceptance criteria:**
- Given a multi-document PDF/package is uploaded, when the splitting processor runs, then it classifies each page (or contiguous page range) by document type (P&L, Balance Sheet, Cash Flow, tax return, other) with a confidence score.
- Pages classified as financial-statement pages above a confidence threshold are auto-extracted into the case's document set; pages below threshold are queued for analyst confirmation ("Is this a Balance Sheet page? Y/N").
- Non-financial pages (cover letters, boilerplate, unrelated exhibits) are excluded from the extraction pipeline but remain accessible in the original source package for lineage/audit purposes.
- Output includes a page-map showing which source pages fed which extracted statement.

**Exceptions:** Scanned/low-quality pages → route to OCR-enhancement step before classification; if still unreadable, flag as "needs manual review," not silently dropped. Package contains multiple entities' statements (e.g. borrower + guarantor) → classifier must separate by entity, not just document type; ambiguous entity boundaries route to analyst confirmation.

**Dependencies:** Document classifier model, OCR pipeline, page-level lineage store.

#### #3 — FS Ingestion and Extraction / Agentic Extraction (POC)
**User story:** As an analyst, the system extracts P&L, Balance Sheet, and Cash Flow line items from whatever format the dealer submits — including multi-year statements — without me re-keying anything.

**Acceptance criteria:**
- Given a financial statement page/document, when extraction runs, then every line item, its label, its value(s) per period, and its source cell location (page, bounding box) are captured into the extraction schema.
- Multi-year/multi-period documents are correctly split into distinct period columns rather than concatenated or overwritten.
- Consolidated (multi-entity roll-up) statements are detected and flagged/excluded from single-entity spreading by default, with an explicit "use consolidated anyway" override for analysts who want it.
- Extraction must handle at least the top N most common statement layouts seen in the dealer population (defined during vendor selection, see Technical Architecture §4) without per-format custom code; unrecognized layouts fall back to a lower-confidence generic table extractor and are flagged for review rather than silently producing wrong numbers.
- Every extracted value carries a confidence score, feeding the existing Trust Inspector / exceptions UI.

**Exceptions:** Handwritten or heavily annotated statements → confidence auto-drops below the exception threshold. Statement uses non-standard line labels (e.g. "Net Sales" vs "Total Revenue") → resolved by the mapping layer (#11/#12), not by extraction guessing the final chart-of-accounts label.

**Dependencies:** Document-intelligence/extraction vendor (Technical Architecture §4), taxonomy (existing `taxonomy.ts` as the target schema), confidence-score plumbing into existing exceptions UI.

#### #5 — Supporting document data extract / DXP key-value (POC)
**User story:** As an analyst, structured fields from credit applications and supporting forms (EIN, DUNS, UBO info, requested amount, etc.) are extracted automatically into the case record instead of manual entry.

**Acceptance criteria:**
- Given a standard application/credit form is uploaded, when key-value extraction runs, then recognized fields populate the corresponding case-record fields automatically, each tagged with its source document/page for lineage.
- Unrecognized or low-confidence fields are surfaced for manual entry/confirmation rather than left silently blank.
- Extracted key-value data is stored in a structured (not free-text) store queryable by other features (risk rules, dashboards).

**Exceptions:** Same form field appears with conflicting values across two documents in the package (e.g. two different EINs) → flagged as a data-mismatch exception (ties into #14/#15), not auto-resolved.

**Dependencies:** Key-value extraction capability (can share vendor with #3), case-record schema.

### 6.3 Mapping epic

#### #9 — Extracted vs. output FS view (MVP)
**User story:** As an analyst, I can see extracted raw line items side-by-side with where they landed in the final standardized output statement, so I can verify the mapping is correct.

**Acceptance criteria:**
- A dedicated view shows two panes: left = extracted line items as they appeared in the source (grouped by source document), right = final Financial Component (FC) output statement.
- Each output line is visually linked (e.g. connector lines or matching highlight) to the extracted line item(s) that feed it, including many-to-one rollups.
- Clicking either side highlights its counterpart(s) on the other side.

**Exceptions:** An output FC line has zero contributing extracted items (should never silently show a number with no lineage) → rendered as "unmapped/manual entry" with a distinct visual treatment.

**Dependencies:** Builds on existing `CompanySpreadView.tsx` + lineage model; needs the raw-extraction pane added.

#### #10 — Rollup visibility (MVP, sub of #9)
**User story:** As an analyst, when I click an extracted value, I see it highlighted directly on the source PDF, and I can see every sub-component that rolls up into a higher-level line.

**Acceptance criteria:**
- Clicking an extracted data point highlights the exact bounding box on the rendered source PDF page (not just "page 3" — the actual cell).
- Every rollup total shows an expandable tree of its contributing sub-components down to leaf extracted values, at every level of the hierarchy (not just one level, as today's calculated-value drill-down does).
- Rollup trees are navigable both directions: total → components, and component → every total it feeds into.

**Exceptions:** Circular or malformed hierarchy in the mapping config → validated at mapping-rule save time (#11), not discovered at render time.

**Dependencies:** PDF cell-level bounding-box data from extraction, existing lineage model extended to full trees (today's `analytics.ts` drill-down is single-level).

#### #11 — Financial Component Map Rules — edit and store (MVP)
**User story:** As an admin, I define and maintain the rules that map extracted/raw line items (with their own hierarchy) into the standard Financial Component taxonomy (description, alias, hierarchy), without needing an engineer to change code.

**Acceptance criteria:**
- Admin UI to create/edit/deactivate mapping rules: raw label/alias pattern → target FC, with support for many-to-one, conditional (e.g. by industry or statement type), and priority-ordered rules.
- Rules are versioned; every case's mapping is tagged with the rule-set version used, so historical spreads don't retroactively change when rules are edited.
- Saving a rule change validates it doesn't create orphaned/circular mappings and shows a preview of affected FCs.
- Changes are audit-logged (who, when, what changed).

**Exceptions:** A rule edit would change historical results for in-flight cases → system prompts "apply to new cases only" (default) vs. "re-run on cases in mapping/review stage" (explicit opt-in, requires re-triggering validation).

**Dependencies:** `taxonomy.ts` becomes server-side/DB-backed config instead of a static file; rule engine; versioning store.

#### #12 — Financial Component Map Rules — visual look (MVP)
**User story:** As an admin, I can see my saved mapping configuration visualized directly in the FS format UI, not just as a rules table.

**Acceptance criteria:**
- A visual diagram (tree/flow) renders the current mapping ruleset: raw items → FCs → rollup hierarchy, matching the actual spread UI's structure.
- Selecting a node in the visualization jumps to/highlights the corresponding rule in the editor (#11) and vice versa.

**Exceptions:** Very large rulesets (hundreds of mappings) → visualization must support collapse/expand and search, not render as one unusable diagram.

**Dependencies:** #11 must exist first (visualizes its output).

### 6.4 Validation epic

#### #14 — Temporal data mismatch checks (MVP)
**User story:** As an analyst, the system automatically flags when a yearly total doesn't reconcile with the sum of quarters or months reported for the same period, so I don't have to manually cross-foot.

**Acceptance criteria:**
- Given a case has both annual and sub-annual (quarterly/monthly) statements for an overlapping period, when validation runs, then the system computes the sum of sub-periods and compares to the reported annual total per FC line, within a configurable tolerance (absolute $ and/or %).
- Mismatches beyond tolerance create a validation exception visible in the existing Exceptions UI, with both values and the delta shown.
- Passes are silent (no exception noise for clean ties).

**Exceptions:** Sub-period data incomplete (e.g. only 3 of 4 quarters received) → check is deferred, not run against partial data as if it were complete, and the UI clearly states "awaiting Q4 to validate."

**Dependencies:** Extraction must tag statements with period type and range; validation rule engine (shared foundation with #15).

#### #15 — Historical mismatch checks (MVP)
**User story:** As an analyst, the system flags when this year's reported prior-year comparison numbers don't match what was actually filed last year, catching restatements or data-entry drift.

**Acceptance criteria:**
- Given a new filing includes a prior-year comparison column, when validation runs, then the system compares those values against the prior year's actual filed/spread values in the case history (or portfolio master DB) per FC line.
- Mismatches beyond tolerance raise an exception with both values, the source of each, and a flag for "restatement" vs. "possible error" (restatement = prior filing explicitly says restated; otherwise treated as a data-quality flag).

**Exceptions:** No prior-year case on file (new borrower) → check is skipped with an explicit "no prior year to compare" state, not a false pass or silent skip.

**Dependencies:** Portfolio master database with historical spreads persisted (not session-scoped, per #30's data model), shared validation rule engine with #14.

### 6.5 Analysis epic

#### #16 — Custom ratios UI (MVP)
**User story:** As an admin/analyst, I can view how any ratio was calculated and define new custom ratios from FCs using simple formula rules, without engineering involvement.

**Acceptance criteria:**
- Every existing ratio (current ratio, DSCR, leverage, etc.) shows its formula and the FC values plugged in when clicked (builds on today's calculated-value drill-down).
- A formula builder lets users compose new ratios from FCs and existing ratios using +, -, *, /, and parentheses (BODMAS precedence), with live validation (no divide-by-zero-prone or circular formulas allowed to save).
- Custom ratios appear alongside built-in ratios in the Ratios tab, are included in policy covenant checks if configured, and are versioned like mapping rules (#11).

**Exceptions:** Formula references an FC not present for a given borrower/period → ratio renders as "N/A — missing {FC}" rather than erroring the whole page or showing 0/blank.

**Dependencies:** Formula engine, FC catalog exposed to the builder UI.

#### #18 — Inline AI ratio explainer (MVP)
**User story:** As an analyst or committee member, I can ask "why is DSCR 0.9x" and get a plain-language explanation pointing to the exact underlying numbers.

**Acceptance criteria:**
- A chat/snippet UI attached to any ratio value answers questions about that specific ratio using only the case's actual data (formula + current FC values + source lineage) — no fabricated commentary.
- Every factual claim in the explanation links back to the source FC/cell (reuses lineage from #10).
- If the underlying data is an exception/unresolved, the explainer says so explicitly rather than confidently explaining a number that may change.

**Exceptions:** LLM/agent service unavailable → UI shows the formula + raw values (deterministic fallback) instead of failing silently with no explanation at all.

**Dependencies:** LLM integration (Technical Architecture §4), #16's formula metadata.

#### #19 — Custom risk recommendation engine (MVP)
**User story:** As a Risk Officer, I define one or more formulae combining ratios, metrics, and their changes to produce a final quantitative risk score, without needing engineering to hardcode it.

**Acceptance criteria:**
- Admin UI to define scoring formulae referencing ratios/FCs/period-over-period deltas, with weights, producing a numeric score and/or letter grade.
- Multiple formulae can coexist (e.g. per business line/product type); a case is scored by the formula assigned to its case type.
- Score recalculates automatically whenever underlying data changes (correction, new period ingested) and the change is logged (old score → new score, what changed).

**Exceptions:** Formula produces an out-of-range or NaN result (e.g. divide by zero from a missing FC) → score shows "unable to calculate" with the specific cause, never a silently wrong number.

**Dependencies:** #16's formula engine (shared), case-type config.

#### #20 — Configurable qualitative risk rules (MVP)
**User story:** As a Risk Officer, I define non-numerical risk rules (e.g. "flag if management experience < 5 years") through a setup screen.

**Acceptance criteria:**
- Admin UI to define rules as: input field (from key-value extraction #5, or manual entry) + operator + threshold + resulting flag/category.
- Rules support AND/OR grouping for compound conditions.
- Rule changes are versioned/audited like mapping and scoring rules.

**Exceptions:** Referenced input field doesn't exist for a given case (e.g. no management-experience field extracted) → rule evaluates to "insufficient data," surfaced distinctly from "rule passed."

**Dependencies:** #5's structured key-value store as the rule input source.

#### #21 — Agentic qualitative risk categorization (MVP)
**User story:** As a Risk Officer, an LLM agent evaluates non-numeric case data (management experience, family relations, legal filings, news) against my configured rules (#20) and assigns risk categories automatically.

**Acceptance criteria:**
- Agent runs #20's rules against extracted/ingested qualitative data and produces category assignments with a rationale citing the specific source data used.
- Categorizations feeding a gate decision are always reviewable/overridable by an analyst before the gate is signed — never auto-applied without visibility.
- Every categorization is logged with the rule version and rationale for audit.

**Exceptions:** Ambiguous or conflicting source data (e.g. two different filings on management tenure) → agent flags "conflicting data" rather than picking one silently; routes to analyst.

**Dependencies:** LLM integration, #20's rule engine, legal/news data source if included in scope (define during architecture — may be phase 2).

#### #31/#32 — Custom portfolio metrics UI + calculated-values table (MVP)
**User story:** As a Portfolio Manager, I define and view custom macro-portfolio metrics (beyond the built-in KPIs) that feed portfolio dashboards.

**Acceptance criteria:**
- Admin UI to define portfolio-level metrics as aggregations (sum/avg/weighted-avg/count) over case-level FCs/ratios/risk scores, with filters (business line, risk grade, date range).
- A calculated-values table shows every defined metric's current value, computed on a schedule or on-demand, and is the data source portfolio dashboards (#30) read from — not a dashboard-only calculation.
- Metric definitions are versioned/audited like other rule types.

**Exceptions:** Metric formula references a case-level field not populated for some cases in scope → those cases are excluded from the aggregation with a visible "N of M cases included" indicator, not silently treated as zero.

**Dependencies:** Portfolio master DB (#30), shared formula engine with #16/#19.

### 6.6 Reporting epic

#### #22 — Credit memo generation (POC → MVP superseded by #23)
**User story:** As an analyst, one click generates a comprehensive credit memo from all extracted data, ratios, and risk scores.

**Acceptance criteria:** (baseline, superseded by #23's template requirement)
- Given a case has reached the Memo stage, when "Generate Memo" is clicked, then a memo document is produced containing borrower summary, spread highlights, ratio/covenant table, risk score and rationale, and recommendation, pulling live from the case's current data (not stale/cached).

**Exceptions:** Case has unresolved exceptions or a failed validation check → memo generation still proceeds (it's a working document) but the memo visibly flags "N unresolved exceptions" rather than presenting confidently-wrong-looking output.

#### #23 — Credit memo template-based (MVP)
**User story:** As a Credit Committee member, the memo I review is generated from a firm-approved, pixel-perfect template, with agent output only filling defined placeholders — not free-form agent writing.

**Acceptance criteria:**
- Given an org-approved memo template (defined by design/compliance), when memo generation runs, then agent-computed values are inserted only into named placeholders; template layout/formatting/branding is never altered by the agent.
- Multiple templates can be configured (e.g. by case type); the correct template is selected automatically based on case type, with manual override available.
- Generated memo is exportable as a real PDF/DOCX (not the current `.txt` placeholder — see [Known Issues](KNOWN_ISSUES.md)).

**Exceptions:** A placeholder's source data is missing/an exception → placeholder renders a visible "[DATA PENDING: {field}]" marker rather than a blank or fabricated value, so it's impossible to send an incomplete memo without noticing.

**Dependencies:** Template engine (e.g. DOCX templating), #22's data assembly, real export pipeline (see Known Issues — "Export as PDF (demo)" fix).

#### #26 — Custom CSV / system export (MVP)
**User story:** As an ops user, I configure a CSV export mapping once and reuse it to push case data into our accounting/LOS system, with cell-level control over what maps where.

**Acceptance criteria:**
- Admin UI to define an export template: for each output CSV column, map to a specific FC, ratio, metadata field, or a fixed value; supports arrays (e.g. one row per period, or one row per line item).
- Saved templates are reusable and versioned; running an export against a case/portfolio uses the selected template and produces a downloadable (and/or API-delivered) CSV matching the mapping exactly.
- Export run is logged (who, when, which template, which cases) for audit.

**Exceptions:** A mapped FC/field is missing for a case included in the export → cell is emitted as configured (blank / "N/A" / error, per template setting), never silently misaligning columns.

**Dependencies:** None beyond the FC/case data model already required elsewhere.

### 6.7 Dashboards epic

#### #28 — Case-level dashboards (POC)
**User story:** As an analyst, I see a configurable dashboard of financial health and case timeline for one dealer/case.

**Acceptance criteria:**
- Dashboard combines: Health grade + pillar breakdown (existing), key ratio trend sparklines, case timeline (stage history, gate sign-off dates, SLA status), and open exceptions count.
- Users can add/remove/reorder widgets from a defined widget catalog (not fully freeform — bounded configurability for v1).

**Exceptions:** Widget's underlying data isn't available yet (e.g. case too early-stage for ratios) → widget shows an empty/pending state, not an error.

#### #29 — Time-series dashboards (POC)
**User story:** As an analyst or manager, I toggle the same financial views between yearly, quarterly, and monthly granularity.

**Acceptance criteria:**
- Any trend/ratio view supports a period-granularity toggle (Y/Q/M); switching preserves the current FC/ratio selection and re-renders with the appropriate periods.
- Granularities with insufficient data (e.g. monthly requested but only annual filed) show "insufficient data at this granularity" rather than interpolating fabricated numbers.

**Dependencies:** Extraction/mapping must tag period type per statement (shared with #14).

#### #30 — Portfolio-level dashboards (MVP)
**User story:** As a Portfolio Manager, I see configurable, aggregated metrics across all active cases, not just the 4 demo borrowers.

**Acceptance criteria:**
- Portfolio dashboard pulls from the calculated-values table (#31/#32), live across every active case the user has permission to see (RBAC-scoped).
- Supports filtering by business line, risk grade, analyst, stage; supports saved views.
- Dashboard is backed by real portfolio data — no borrower is hardcoded/scripted.

**Exceptions:** Zero cases match the current filter → explicit "no cases match" empty state, not a blank/broken chart.

**Dependencies:** Portfolio master DB, #31/#32.

---

## 7. Cross-cutting requirements

These apply across every feature above and are not optional per-feature — they're what makes the difference between "demo" and "production."

| Area | Requirement |
|---|---|
| **Audit trail** | Every state change (gate sign, override, correction, rule edit, assignment, notification sent) is immutably logged: actor, timestamp, before/after, reason where applicable. Existing gate/override audit log is the baseline pattern to extend everywhere. |
| **RBAC** | Role-based permissions (Analyst, Manager, Committee, Risk/Compliance, Admin, read-only Observer) gate every mutating action; enforced server-side, not just hidden in the UI. |
| **Multi-tenancy** | Case, mapping-rule, ratio, and risk-rule data scoped per lending organization; no cross-tenant data leakage. |
| **Data retention & compliance** | Financial/PII data retention policy defined (GLBA-adjacent); encryption at rest and in transit; PII fields (SSN, EIN, DUNS) access-logged. |
| **Notifications** | Central notification service (in-app + email, extensible to Slack/Teams) used by #7, #8, gate-pending reminders, and assignment changes — one system, not bespoke per feature. |
| **Error handling** | Every async operation (extraction, LLM call, export, notification send) has a defined failure UI state with a retry or escalation path — "spinner forever" or silent failure is never acceptable. |
| **Idempotency** | Re-running extraction/mapping/validation on the same inputs produces the same outputs; re-sending a dealer request doesn't duplicate outbound emails. |

## 8. Success metrics

- % of gates signed without a manual data-correction (data quality proxy)
- Median time from case creation to Gate 5 decision
- % of extraction exceptions requiring manual override (extraction quality proxy)
- Dealer document turnaround time after automated reminder/request (#7/#8 effectiveness)
- Zero P0 "dead button" defects in production (ties to [Known Issues](KNOWN_ISSUES.md) closure)

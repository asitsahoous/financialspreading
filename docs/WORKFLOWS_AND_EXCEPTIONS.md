# Workflows & Exception Catalog

**Status:** Draft for review · **Last updated:** 2026-07-02
**Companion documents:** [PRD](PRD.md) · [Technical Architecture](TECHNICAL_ARCHITECTURE.md) · [Known Issues](KNOWN_ISSUES.md) · [Roadmap](ROADMAP.md)

This document is the operational counterpart to the [PRD](PRD.md): every major workflow end-to-end, its happy path, and — the part the prototype currently lacks almost everywhere — **every exception path and how the system recovers from it**. Nothing in production should have a dead end; every row in every exception table below ends in either automatic recovery or an explicit human handoff, never silence.

Base pipeline reference: `backend/graph/graph.py` — `intake → Gate1 → connector + document_intel → mapping → Gate2 → review → risk → Gate3 → memo → Gate4 → decision → Gate5 → END`.

---

## 1. Case creation & assignment

**Actors:** System (on new inbound package or manual creation), Portfolio Manager, Analyst
**Trigger:** New borrower package received (email/portal/manual upload) or analyst manually creates a case.

**Happy path:**
1. Case record created (borrower name, case type, business line) — a real record, not a route to a hardcoded fixture (see [Known Issues P0-6](KNOWN_ISSUES.md)).
2. System auto-assigns to next available analyst via round-robin (PRD #1).
3. Analyst receives an in-app + email notification of new assignment.
4. Case appears in analyst's Command Center queue at "Intake" stage.

**Exceptions:**

| Exception | Detection | System behavior | Recovery |
|---|---|---|---|
| No analysts available for the business line | Assignment pool empty at case creation | Case flagged "Unassigned — no pool," visible to managers | Manager manually assigns or configures the pool |
| All analysts at capacity | Round-robin exhausts without finding capacity | Case queued "Unassigned — capacity," manager notified | Manager reassigns, raises someone's capacity limit, or manually accepts overflow |
| Duplicate case for same borrower/period already open | Borrower+case-type+period match found | New case blocked with a merge/duplicate prompt | Analyst confirms merge into existing case or explicitly creates a distinct new one (e.g. genuinely concurrent facilities) |
| Case creation from an ambiguous source package (multi-borrower package) | Splitting step (§3) can't cleanly separate entities | Case creation paused, routed to a manual "which borrower(s)" triage step | Analyst splits manually into N cases |

---

## 2. Intake / document collection (Gate 1)

**Actors:** Analyst, Dealer contact, System (reminder/exception agent)
**Trigger:** Case enters Intake stage.

**Happy path:**
1. Required document checklist generated from case type's SOP (existing `sopPolicy.tsx` pattern).
2. Dealer uploads documents (or analyst uploads on their behalf) via real file upload with actual storage (not just filename capture).
3. As each document arrives, splitting (§3) and classification run automatically, checking it off the checklist.
4. When all required documents are received, Gate 1 becomes signable.
5. Analyst signs Gate 1 → pipeline unlocked → case advances to Connector Sync + Document Intelligence in parallel.

**Exceptions:**

| Exception | Detection | System behavior | Recovery |
|---|---|---|---|
| Document missing past due date | Reminder job (PRD #7) | T-3 reminder to dealer/analyst; overdue flag + escalation after grace period | Dealer uploads; if still missing, agentic exception handling (#8) drafts a follow-up |
| Uploaded document fails to parse/classify (corrupt file, wrong format) | Splitting/classification step | Document marked "needs manual review," checklist item stays open, analyst notified | Analyst reviews the file manually, requests a re-upload, or manually confirms document type |
| Wrong document type uploaded for a checklist slot | Low-confidence classification match | Document held for confirmation before being auto-checked off | Analyst confirms or rejects the classification |
| Analyst tries to sign Gate 1 with documents still missing | Gate 1 sign action, checklist incomplete | Sign blocked with explicit "N documents still missing" message (no silent failure) | Analyst uses "Override with reason (logged)" (audited, does not pass the gate) or waits for documents |
| Override used instead of real completion | Override action | Logged to `overrides_audit_log`, case stays blocked at Gate 1 regardless of override | Compliance/manager review of override reason; case remains genuinely blocked — override is a note, not a bypass |
| Dealer uploads to the wrong case (e.g. replies to an old email thread) | N/A automatically — needs matching heuristic | Document received but unmatched to any open checklist item | Routed to an "unmatched uploads" review queue for manual assignment, never silently discarded |

---

## 3. Document splitting, extraction & key-value intake (PRD #2, #3, #5)

**Actors:** System (extraction pipeline), Analyst (exception review)
**Trigger:** Document received and checked off intake checklist.

**Happy path:**
1. Splitting processor classifies pages by type (P&L/BS/CFS/tax/application/other), separating financial-statement pages from the rest of the package.
2. OCR/layout stage extracts tables and text with bounding boxes.
3. LLM extraction agent maps raw line items to labeled values per period, with confidence scores.
4. Supporting-document key-value extraction populates structured case fields (EIN, DUNS, UBO, requested amount, etc.).
5. All extracted items feed the Trust Inspector / exceptions UI, tagged with source lineage.

**Exceptions:**

| Exception | Detection | System behavior | Recovery |
|---|---|---|---|
| Page classification confidence below threshold | Splitting step | Page queued for analyst yes/no confirmation, excluded from auto-extraction until confirmed | Analyst confirms/corrects page type |
| Statement is consolidated (multi-entity) when single-entity expected | Consolidation flag detected | Excluded from single-entity spread by default, flagged | Analyst explicitly opts in to use it anyway, or requests entity-level statements |
| Extraction confidence below threshold on a line item | Per-field confidence score | Field shown as an exception in the existing Exceptions tab (today's Trust Inspector pattern) | Analyst inspects source cell, accepts or corrects the mapping |
| Unrecognized statement layout (extraction can't map at all) | Generic-table fallback still fails | Line items surfaced as "unmapped — needs manual entry," never silently dropped | Analyst manually enters/maps the values, which feeds back into the mapping-rule training/config over time |
| Conflicting values for the same field across two documents (e.g. two EINs) | Key-value extraction cross-check | Flagged as a data-mismatch exception, not auto-resolved | Analyst determines the correct value, logs the resolution |
| Extraction service (OCR/LLM vendor) unavailable or times out | Service health check / timeout | Document held in "extraction pending — retry scheduled," not marked failed permanently on first miss | Automatic retry with backoff; after N failures, escalate to analyst with the specific error, per [PRD §7](PRD.md#7-cross-cutting-requirements) |
| Handwritten/heavily annotated source | Low OCR confidence across the page | Whole document flagged for manual spreading rather than auto-extraction | Analyst manually keys the statement or requests a clean copy from the dealer |

---

## 4. Mapping & normalization (Gate 2)

**Actors:** Analyst, System (mapping rule engine)
**Trigger:** Extraction complete for a document set.

**Happy path:**
1. Mapping rules (PRD #11) apply extracted items to the Financial Component taxonomy, producing rollups.
2. Extracted-vs-output view (#9) and rollup visibility (#10) let the analyst verify the mapping.
3. Exceptions (low-confidence mappings, unmapped items) appear in the Exceptions tab.
4. Analyst resolves all exceptions (accept/override with corrected value + reason).
5. Analyst signs Gate 2 → Review/Validation begins.

**Exceptions:**

| Exception | Detection | System behavior | Recovery |
|---|---|---|---|
| No mapping rule matches an extracted label | Rule engine evaluation | Item surfaced as "unmapped," excluded from rollups until resolved (never silently mapped to the nearest guess) | Analyst manually maps it; optionally promotes the mapping to a new rule (feeds #11) |
| Mapping rule produces a circular/ambiguous rollup | Rule validation at edit-time (§ below) and at run-time as a safety net | Case-level rollup flagged broken, blocks Gate 2 | Admin fixes the offending rule; case re-evaluates automatically once fixed |
| Analyst attempts Gate 2 sign with open exceptions | Gate 2 sign action | Blocked, auto-switches to Exceptions tab (existing pattern) with a specific count | Analyst resolves remaining exceptions |
| Correction changes a value that other cases/periods reference (shared rule vs. one-off override) | Save-correction action | System distinguishes a one-off field override (this case only) from a rule change (all future cases) — the UI must make this distinction explicit, never silently apply one-off logic as a global rule change | Analyst chooses scope explicitly when saving a correction |

### 4a. Mapping-rule administration (PRD #11, #12)

**Actors:** Admin
**Happy path:** Admin edits/creates a mapping rule → preview shows affected FCs → save → new version created, tagged to future cases by default.

**Exceptions:**

| Exception | Detection | System behavior | Recovery |
|---|---|---|---|
| Rule edit would retroactively change in-flight cases' mappings | Save-time impact check | Prompts explicit choice: "new cases only" (default) vs. "re-run on in-flight cases" | Admin chooses; re-run path re-triggers validation on affected cases, doesn't silently mutate signed gates |
| Rule creates orphaned FC (nothing maps to it) or a circular hierarchy | Save-time validation | Save blocked with the specific conflict shown | Admin fixes before saving — never allowed to persist a broken ruleset |

---

## 5. Validation (temporal & historical mismatch checks — PRD #14, #15)

**Actors:** System, Analyst
**Trigger:** Mapping complete, statement includes overlapping periods or a prior-year comparison.

**Happy path:**
1. Temporal check: annual total vs. sum of quarters/months, within tolerance → pass silently.
2. Historical check: current filing's prior-year column vs. actual prior filing on record → pass silently.
3. Case proceeds to Risk & Covenant.

**Exceptions:**

| Exception | Detection | System behavior | Recovery |
|---|---|---|---|
| Temporal mismatch beyond tolerance | Sum-of-periods vs. annual comparison | Exception raised with both values + delta | Analyst investigates, corrects the erroneous source, or documents a legitimate reason (e.g. reclassification) |
| Sub-period data incomplete | Fewer periods on file than expected | Check deferred, UI states "awaiting Q4" explicitly — never run against partial data as if complete | Check re-runs automatically once the missing period is ingested |
| Historical mismatch beyond tolerance | Prior-year comparison vs. filed history | Exception raised, tagged "possible restatement" or "possible error" based on whether a restatement is explicitly indicated | Analyst confirms restatement (documents it) or treats as a data-quality issue requiring dealer follow-up |
| No prior year on file (new borrower) | No historical case found | Explicit "no prior year to compare" state, not a false pass | N/A — informational only |

---

## 6. Risk & covenant assessment (Gate 3)

**Actors:** Analyst, Risk Officer, System (risk/ratio/qualitative engines)
**Trigger:** Validation passed (or exceptions consciously accepted).

**Happy path:**
1. Ratios computed from FCs (PRD #16), checked against policy covenants (existing pass/warn/fail pattern).
2. Quantitative risk score computed via the configured formula (#19).
3. Qualitative risk rules (#20) evaluated by the agent (#21) against key-value/supporting data.
4. Analyst/Risk Officer reviews the assembled risk picture, resolves any flagged categorizations.
5. Gate 3 signed → Credit Memo generation begins.

**Exceptions:**

| Exception | Detection | System behavior | Recovery |
|---|---|---|---|
| Ratio formula references a missing FC | Formula evaluation | Ratio renders "N/A — missing {FC}," not 0 or blank | Analyst supplies the missing data or accepts the gap with a note |
| Risk formula produces NaN/out-of-range result | Formula evaluation | Score shows "unable to calculate" with cause | Admin/analyst investigates the formula or the underlying data |
| Qualitative rule references a field with no extracted value | Rule evaluation | Rule evaluates "insufficient data," distinct from "rule passed" | Analyst supplies the data manually or accepts the gap |
| Agentic categorization hits conflicting source data | Cross-source comparison | Flagged "conflicting data," never silently resolved by the agent | Routed to analyst/Risk Officer for manual determination |
| Covenant fails (hard fail, not just warn) | Covenant check | Gate 3 sign requires an explicit acknowledgment/override with reason, distinct from a normal sign | Escalation path to Risk Officer/manager per policy |

---

## 7. Credit memo generation (Gate 4)

**Actors:** Analyst, Credit Committee, System (memo template engine)
**Trigger:** Gate 3 signed.

**Happy path:**
1. Template selected automatically by case type (PRD #23).
2. Agent fills defined placeholders only from case data (spread, ratios, risk score/rationale).
3. Analyst reviews, comments/requests revisions if needed (real, persisted — see [Known Issues P1-6](KNOWN_ISSUES.md)).
4. Analyst signs Gate 4 → memo locked for committee review → Decision stage.

**Exceptions:**

| Exception | Detection | System behavior | Recovery |
|---|---|---|---|
| Placeholder's source data missing/unresolved exception | Template assembly | Placeholder renders a visible "[DATA PENDING: {field}]" marker | Analyst resolves the underlying exception; memo re-assembles automatically |
| No template configured for this case type | Template selection | Generation blocked with explicit "no template configured for {case type}" | Admin configures a template, or analyst manually selects a fallback |
| Revision requested by committee/reviewer | Comment/revision action | Logged to audit trail, memo status set "revisions requested," Gate 4 re-opens | Analyst addresses, resubmits |
| Export to PDF/DOCX fails | Export pipeline | Explicit failure with retry, never a silent wrong-format download (fixes [Known Issues P1-1](KNOWN_ISSUES.md)) | Retry; escalate to admin if persistent |

---

## 8. Decision / committee (Gate 5)

**Actors:** Credit Committee
**Trigger:** Gate 4 signed.

**Happy path:**
1. Committee reviews memo + full lineage.
2. Committee records Approve / Decline / Table (existing Gate 5 committee actions).
3. Decision signed → case closed to "Decision recorded" status → downstream systems (CSV/system export, portfolio dashboards) updated.

**Exceptions:**

| Exception | Detection | System behavior | Recovery |
|---|---|---|---|
| Committee tables the decision (needs more info) | Table action | Case reopens to the relevant earlier stage (e.g. back to Risk if more analysis needed), not stuck at Decision indefinitely | Analyst addresses the requested info, case re-enters Gate 5 queue |
| Committee declines | Decline action | Case marked Declined, audit-logged with rationale, notification to analyst/dealer per policy | Terminal state — no further pipeline action, but visible in portfolio history |
| Split committee vote / no quorum | Voting model (if implemented) | Decision held "pending quorum," not silently defaulted either way | Escalation to designated tie-breaker per org policy |

---

## 9. Post-decision: notifications, reminders, portfolio monitoring

**Actors:** System, Portfolio Manager, Analyst
**Trigger:** Ongoing, scheduled.

**Happy path:**
1. Proactive reminders (#7) fire for upcoming/overdue recurring statements on active/approved facilities.
2. Portfolio Sentinel scans active cases against risk/covenant thresholds (real, not the static fixtures noted in [Known Issues P1-5](KNOWN_ISSUES.md)) and raises alerts.
3. Portfolio/time-series dashboards (#28, #29, #30) reflect live aggregated data.

**Exceptions:**

| Exception | Detection | System behavior | Recovery |
|---|---|---|---|
| Notification delivery fails (bounced email, webhook down) | Delivery service response | Retried with backoff, then surfaced in-app as "delivery failed" | Analyst/admin sees failure, can manually resend or fix contact info |
| Portfolio Sentinel scan finds a covenant breach | Scheduled scan | Case flagged Critical on Command Center, notification to assigned analyst + manager | Analyst initiates a review/annual-review case, or documents a waiver |
| Scheduled job (reminders, metric recalculation) fails to run | Job scheduler health check | Failure alerts to admin/ops (observability, [Technical Architecture §11](TECHNICAL_ARCHITECTURE.md#11-observability)), not a silent missed cycle | Ops investigates, job re-runs, no reminders/metrics silently go stale |

---

## 10. Corrections & overrides (Trust Inspector — cross-cutting)

**Actors:** Analyst
**Trigger:** Any field flagged as an exception, at any stage.

**Happy path:**
1. Analyst opens Trust Inspector on a flagged field.
2. Accepts the mapping as-is, or enters a corrected value + rationale.
3. Save triggers live recompute of dependent subtotals/totals/ratios, integrity banner updates, trust score updates, change-history entry logged.

**Exceptions:**

| Exception | Detection | System behavior | Recovery |
|---|---|---|---|
| Correction conflicts with a value already used in a signed gate's memo/decision | Save-time check | Correction still allowed (data can change post-signature) but flagged as "post-signature correction," triggering a re-notification to anyone downstream (committee, if memo already generated) | Downstream artifacts (memo) get a "data changed since generation" banner rather than silently going stale |
| Correction has no rationale entered | Save action | Blocked — rationale is required for every correction, no silent overrides | Analyst provides rationale |
| Two analysts correct the same field concurrently (multi-user race) | Optimistic concurrency check on save | Second save blocked with "field changed since you loaded it," shows the other analyst's value | Analyst reconciles and re-saves |

---

## 11. Exports (CSV/system export — PRD #26)

**Actors:** Ops/Admin
**Trigger:** Analyst/ops runs an export against a case or portfolio using a saved template.

**Happy path:**
1. Template selected, export runs against selected case(s).
2. CSV generated exactly per the cell-level mapping, downloadable and/or delivered via API.
3. Export run logged (who, when, template, cases).

**Exceptions:**

| Exception | Detection | System behavior | Recovery |
|---|---|---|---|
| Mapped field missing for a case in scope | Export generation | Cell emitted per template's configured missing-value behavior (blank/"N/A"/error) — never misaligns columns | Ops adjusts template config or the underlying data |
| Template references a since-deleted FC/field | Export generation | Export blocked with the specific broken mapping named | Admin fixes the template before re-running |

---

## Summary: exception-handling principles applied throughout

1. **No silent failure** — every automated step that can fail has a visible state for "failed," not just "success" or nothing.
2. **No silent guessing** — low-confidence extraction/mapping/classification always routes to human confirmation rather than picking the most likely answer silently.
3. **Every override requires a reason** and is logged immutably.
4. **Partial data is labeled partial**, never treated as complete (temporal/historical checks, missing FCs in ratios).
5. **Retries are automatic and bounded**, with an explicit escalation once exhausted — never an infinite silent loop (agentic dealer follow-ups, extraction retries).
